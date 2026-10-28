<?php

declare(strict_types=1);

namespace App\Modules\Marketing\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Marketing\Services\BookingDistributionService;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class BookingDistributionController extends Controller
{
    public function index(Request $request, BookingDistributionService $service)
    {
        $request->validate(['business_id' => 'nullable|integer|min:1']);
        abort_unless(in_array($request->user()->role, ['ADMIN_BARBERIA', 'SUPERADMIN'], true), 403);
        $businesses = Business::where('is_active', true)->when($request->user()->role !== 'SUPERADMIN', fn ($q) => $q->whereIn('id', app(BusinessAccessService::class)->businessIds($request->user())))->orderBy('name')->get(['id', 'name']);
        $id = (int) ($request->business_id ?: $businesses->first()?->id);
        abort_unless($businesses->contains('id', $id), 403);
        return ServiceResponse::success(['businesses' => $businesses, 'business_id' => $id, 'settings' => $service->settings($id),
            'services' => Service::where('business_id', $id)->where('is_active', true)->get(['id', 'name']),
            'resources' => Resource::where('business_id', $id)->where('is_active', true)->get(['id', 'name']),
            'branches' => BusinessBranch::where('business_id', $id)->where('is_active', true)->get(['id', 'name']),
            'professionals' => Professional::where('business_id', $id)->where('is_active', true)->get(['id', 'name']),
            'promotions' => Promotion::where('business_id', $id)->whereNotNull('promo_code')->where('is_active', true)->get()->filter(fn ($p) => $p->isValid())->map(fn ($p) => ['id' => $p->promo_code, 'name' => $p->title])->values(),
            'links' => DB::table('marketing.booking_links')->where('business_id', $id)->orderByDesc('created_at')->limit(100)->get()->map(fn ($link) => $service->present($link))])->toJsonResponse();
    }

    public function settings(Request $request, int $businessId, BookingDistributionService $service)
    {
        $this->business($request, $businessId);
        $data = $request->validate(['enabled' => 'required|boolean', 'theme' => 'required|in:light,dark', 'locale' => 'required|in:es,en',
            'allowed_origins' => 'required|array|max:10', 'allowed_origins.*' => 'required|string|max:255']);
        $data['allowed_origins'] = json_encode($service->origins($data['allowed_origins']), JSON_THROW_ON_ERROR);
        DB::table('marketing.booking_distribution')->updateOrInsert(['business_id' => $businessId], $data + ['updated_at' => now(), 'created_at' => now()]);
        return ServiceResponse::success($service->settings($businessId))->toJsonResponse();
    }

    public function store(Request $request, BookingDistributionService $service)
    {
        $data = $request->validate(['business_id' => 'required|integer|min:1', 'label' => 'required|string|max:100',
            'service_id' => 'nullable|integer|min:1', 'branch_id' => 'nullable|integer|min:1', 'resource_id' => 'nullable|integer|min:1',
            'professional_id' => 'nullable|integer|min:1', 'promo_code' => 'nullable|string|max:100']);
        $business = $this->business($request, (int) $data['business_id']);
        $id = (string) Str::uuid();
        DB::table('marketing.booking_links')->insert(['id' => $id, 'business_id' => $business->id, 'created_by' => $request->user()->id,
            'label' => $data['label'], 'selection' => json_encode($service->selection($business, $data), JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
        return ServiceResponse::success($service->present(DB::table('marketing.booking_links')->where('id', $id)->first()), 'Enlace creado', 201)->toJsonResponse();
    }

    public function destroy(Request $request, string $id)
    {
        $link = DB::table('marketing.booking_links')->where('id', $id)->first();
        abort_unless($link, 404);
        $this->business($request, $link->business_id);
        DB::table('marketing.booking_links')->where('id', $id)->update(['active' => false, 'updated_at' => now()]);
        return ServiceResponse::success(null)->toJsonResponse();
    }

    public function go(string $id, BookingDistributionService $service)
    {
        [$link, $business] = $this->publicLink($id);
        $destination = $service->destination($link, $business);
        DB::table('marketing.booking_links')->where('id', $id)->increment('opens_count', 1, ['last_opened_at' => now()]);
        return redirect()->away($destination)->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function widget(string $id, BookingDistributionService $service)
    {
        [$link, $business] = $this->publicLink($id);
        $settings = $service->settings($business->id);
        abort_unless($settings['enabled'], 404);
        $service->destination($link, $business);
        $ancestors = "'self'".($settings['allowed_origins'] ? ' '.implode(' ', $settings['allowed_origins']) : '');
        return response()->view('distribution.widget', ['business' => $business, 'settings' => $settings, 'url' => $service->present($link)['url']])
            ->header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors ".$ancestors."; base-uri 'none'; form-action 'none'")
            ->header('X-Content-Type-Options', 'nosniff')->header('Referrer-Policy', 'no-referrer')->header('Cache-Control', 'no-store')->header('X-Robots-Tag', 'noindex, nofollow');
    }

    private function publicLink(string $id): array
    {
        $link = DB::table('marketing.booking_links')->where('id', $id)->where('active', true)->first();
        abort_unless($link, 404);
        return [$link, Business::whereKey($link->business_id)->where('is_active', true)->firstOrFail()];
    }

    private function business(Request $request, int $id): Business
    {
        abort_unless(in_array($request->user()->role, ['ADMIN_BARBERIA', 'SUPERADMIN'], true), 403);
        $business = Business::findOrFail($id);
        abort_unless($request->user()->role === 'SUPERADMIN' || in_array($id, app(BusinessAccessService::class)->businessIds($request->user()), true), 403);
        return $business;
    }
}
