<?php

declare(strict_types=1);

namespace App\Modules\Marketing\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Marketing\Models\Ad;
use App\Modules\Marketing\Services\AdMeasurementService;
use App\Modules\Marketing\Services\AdService;
use App\Services\BusinessAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdController extends Controller
{
    public function __construct(private AdService $service) {}

    public function index(Request $request): JsonResponse
    {
        $placement = $request->validate(['placement' => 'required|string|max:100'])['placement'];
        return $this->service->getAdsForPlacement($placement, $request->user('sanctum')?->id)->toJsonResponse();
    }

    public function click(Request $request, int $id): JsonResponse
    {
        return $this->measure($request, $id, 'click');
    }

    public function impression(Request $request, int $id): JsonResponse
    {
        return $this->measure($request, $id, 'impression');
    }

    public function manage(Request $request): JsonResponse
    {
        $this->admin($request->user());
        $businesses = Business::query()->when($request->user()->role !== 'SUPERADMIN', fn ($query) => $query->whereIn('id', app(BusinessAccessService::class)->businessIds($request->user())))
            ->where('is_active', true)->get(['id', 'name', 'slug']);
        $ads = Ad::whereIn('business_id', $businesses->pluck('id'))->orderByDesc('created_at')->limit(100)->get();
        $completed = DB::table('marketing.ad_attributions as a')->join('booking.appointments as p', 'p.id', '=', 'a.appointment_id')
            ->join('marketing.ad_deliveries as d', 'd.id', '=', 'a.delivery_id')->join('platform.analytics_preferences as consent', 'consent.user_id', '=', 'd.user_id')
            ->where('consent.measurement', true)->where('p.status', 'COMPLETED')->whereNull('p.deleted_at')->whereIn('a.ad_id', $ads->pluck('id'))
            ->groupBy('a.ad_id')->selectRaw('a.ad_id, count(*) as count')->pluck('count', 'ad_id');
        return ServiceResponse::success(['businesses' => $businesses, 'ads' => $ads->map(fn ($ad) => array_merge($ad->toArray(), ['completed_attributed_bookings' => (int) ($completed[$ad->id] ?? 0)])),
            'can_moderate' => $request->user()->role === 'SUPERADMIN', 'billing_enabled' => false, 'currency' => 'COP',
            'attribution_window_days' => 7, 'attribution_model' => 'LAST_CONSENTED_CLICK_SAME_BUSINESS', 'incremental_measurement' => false])->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $this->admin($request->user());
        $data = $this->validated($request);
        $businessId = (int) ($request->input('business_id') ?: Business::where('owner_user_id', $request->user()->id)->value('id'));
        $business = $this->business($request->user(), $businessId);
        $ad = DB::transaction(function () use ($data, $business, $request) {
            $ad = Ad::create($data + ['business_id' => $business->id, 'status' => 'PENDING', 'moderation_status' => 'PENDING',
                'link_url' => '/b/'.$business->slug, 'impressions_count' => 0, 'clicks_count' => 0, 'spent' => 0, 'priority' => 0]);
            $this->audit($ad, $request->user(), 'CREATED');
            return $ad;
        });
        return ServiceResponse::success($ad, 'Anuncio enviado a revisión.', 201)->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validated($request);
        $ad = DB::transaction(function () use ($request, $id, $data) {
            $ad = $this->ownedAd($request->user(), $id);
            $ad->update(array_merge($data, ['status' => 'PENDING', 'moderation_status' => 'PENDING', 'moderation_reason' => null, 'moderated_by' => null, 'moderated_at' => null]));
            $this->audit($ad, $request->user(), 'EDITED');
            return $ad;
        });
        return ServiceResponse::success($ad, 'Cambios guardados y enviados nuevamente a revisión.')->toJsonResponse();
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:ACTIVE,PAUSED']);
        $ad = DB::transaction(function () use ($request, $id, $data) {
            $ad = $this->ownedAd($request->user(), $id);
            abort_if($data['status'] === 'ACTIVE' && $ad->moderation_status !== 'APPROVED', 422, 'El anuncio debe ser aprobado antes de publicarse.');
            $ad->update($data);
            $this->audit($ad, $request->user(), $data['status'] === 'ACTIVE' ? 'RESUMED' : 'PAUSED');
            return $ad;
        });
        return ServiceResponse::success($ad)->toJsonResponse();
    }

    public function moderate(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $data = $request->validate(['decision' => 'required|in:APPROVED,REJECTED', 'reason' => 'nullable|required_if:decision,REJECTED|string|min:5|max:1000']);
        $ad = DB::transaction(function () use ($request, $id, $data) {
            $ad = Ad::whereKey($id)->lockForUpdate()->firstOrFail();
            $ad->update(['moderation_status' => $data['decision'], 'status' => $data['decision'] === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
                'moderation_reason' => $data['reason'] ?? null, 'moderated_by' => $request->user()->id, 'moderated_at' => now()]);
            $this->audit($ad, $request->user(), $data['decision'], $data['reason'] ?? null);
            return $ad;
        });
        return ServiceResponse::success($ad)->toJsonResponse();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(function () use ($request, $id) {
            $ad = $this->ownedAd($request->user(), $id);
            $this->audit($ad, $request->user(), 'DELETED');
            $ad->delete();
        });
        return ServiceResponse::success(null, 'Anuncio retirado. Su auditoría se conserva.')->toJsonResponse();
    }

    public function myAds(Request $request): JsonResponse
    {
        $this->admin($request->user());
        $ids = app(BusinessAccessService::class)->businessIds($request->user());
        return ServiceResponse::success(Ad::whereIn('business_id', $ids)->latest()->get())->toJsonResponse();
    }

    private function measure(Request $request, int $id, string $event): JsonResponse
    {
        $data = $request->validate(['delivery_token' => 'required|uuid']);
        app(AdMeasurementService::class)->record($id, $data['delivery_token'], $event, $request->user('sanctum')?->id);
        return ServiceResponse::success(null)->toJsonResponse();
    }

    private function validated(Request $request): array
    {
        $data = $request->validate(['title' => 'required|string|max:255', 'description' => 'nullable|string|max:1000',
            'image_url' => 'nullable|url:https|max:255', 'placement' => 'required|in:HOME,HOME_BANNER,SEARCH_RESULT,CATEGORY_SIDEBAR,CHECKOUT_PAGE',
            'start_date' => 'required|date_format:Y-m-d', 'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0|max:99999999|decimal:0,2', 'impression_limit' => 'nullable|integer|min:1|max:100000000',
            'click_limit' => 'nullable|integer|min:1|max:100000000', 'targeting' => 'prohibited', 'spent' => 'prohibited', 'priority' => 'prohibited', 'status' => 'prohibited']);
        if ($data['placement'] === 'HOME_BANNER') $data['placement'] = 'HOME';
        return $data;
    }

    private function ownedAd(User $user, int $id): Ad
    {
        $this->admin($user);
        $ad = Ad::whereKey($id)->lockForUpdate()->firstOrFail();
        $this->business($user, $ad->business_id);
        return $ad;
    }

    private function business(User $user, int $id): Business
    {
        abort_unless($user->role === 'SUPERADMIN' || in_array($id, app(BusinessAccessService::class)->businessIds($user), true), 403);
        return Business::findOrFail($id);
    }

    private function admin(User $user): void
    {
        abort_unless(in_array($user->role, ['ADMIN_BARBERIA', 'SUPERADMIN'], true), 403);
    }

    private function audit(Ad $ad, User $actor, string $action, ?string $reason = null): void
    {
        DB::table('marketing.ad_audit_events')->insert(['ad_id' => $ad->id, 'actor_id' => $actor->id, 'action' => $action, 'reason' => $reason, 'created_at' => now()]);
    }
}
