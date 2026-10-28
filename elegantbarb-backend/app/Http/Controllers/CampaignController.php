<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Modules\Business\Models\Business;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Services\BusinessAccessService;
use App\Services\CampaignAnalyticsService;
use App\Services\CampaignAudienceService;
use App\Services\CampaignDeliveryService;
use App\Services\CampaignService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    public function __construct(private CampaignService $campaignService, private BusinessAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'nullable|integer|min:1', 'q' => 'nullable|string|max:200',
            'status' => 'nullable|in:DRAFT,PENDING,PROCESSING,COMPLETED,FAILED,SENT,SENDING,SCHEDULED', 'type' => 'nullable|in:PROMO,NEWS,REMINDER,CUSTOM']);
        $query = Campaign::query()->with(['user:id,name', 'barberShop:id,name', 'promotion']);
        if ($request->user()->role !== 'SUPERADMIN') $query->whereIn('business_id', $this->access->businessIds($request->user()));
        if (isset($data['business_id'])) $query->where('business_id', $this->businessId($request));
        if (! empty($data['q'])) $query->whereRaw('LOWER(subject) LIKE ?', ['%'.mb_strtolower($data['q']).'%']);
        if (! empty($data['status'])) $query->where('status', $data['status']);
        if (! empty($data['type'])) $query->where('type', $data['type']);
        return response()->json($query->latest('id')->get());
    }

    public function options(Request $request, CampaignDeliveryService $delivery): JsonResponse
    {
        $businesses = Business::query()->when($request->user()->role !== 'SUPERADMIN',
            fn (Builder $query) => $query->whereIn('id', $this->access->businessIds($request->user())))->orderBy('name')->get(['id', 'name']);
        $ids = $businesses->modelKeys();
        return response()->json(['businesses' => $businesses,
            'promotions' => Promotion::whereIn('business_id', $ids)->latest('id')->get(['id', 'business_id', 'title', 'promo_code', 'discount', 'type', 'is_active', 'start_date', 'end_date']),
            'tiers' => Client::whereIn('business_id', $ids)->whereNotNull('tier')->distinct()->orderBy('tier')->pluck('tier'),
            'integration' => $delivery->integration()]);
    }

    public function audiencePreview(Request $request, CampaignAudienceService $audience): JsonResponse
    {
        $data = $this->validatedAudience($request);
        return response()->json($audience->preview($this->businessId($request), $data['target_role'], $data['target_ids'] ?? null, $data['segment'] ?? []));
    }

    public function show(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorizeCampaign($request, $campaign);
        return response()->json($campaign->load(['user:id,name', 'barberShop:id,name', 'promotion']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedCampaign($request);
        $data['business_id'] = $this->businessId($request);
        $data['user_id'] = $request->user()->id;
        $data['status'] = 'DRAFT';
        return response()->json($this->campaignService->createCampaign($data)->load('promotion'), 201);
    }

    public function update(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorizeCampaign($request, $campaign);
        if ($request->filled('business_id')) abort_unless($request->integer('business_id') === (int) $campaign->business_id, 422, 'El negocio de una campaña no se puede cambiar.');
        $data = $this->validatedCampaign($request, $campaign);
        unset($data['business_id']);
        return response()->json($this->campaignService->updateCampaign($campaign, $data));
    }

    public function send(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorizeCampaign($request, $campaign);
        if (! $this->campaignService->queueCampaign($campaign->id)) {
            return response()->json(['error' => 'No hay destinatarios pendientes o la campaña ya está en proceso.'], 400);
        }
        return response()->json(['message' => 'Campaña encolada. Los reintentos conservan el historial y la audiencia original.', 'campaign' => $campaign->fresh()]);
    }

    public function stats(Request $request, Campaign $campaign, CampaignAnalyticsService $analytics): JsonResponse
    {
        $this->authorizeCampaign($request, $campaign);
        return response()->json($analytics->stats($campaign));
    }

    public function destroy(Request $request, Campaign $campaign): JsonResponse
    {
        $this->authorizeCampaign($request, $campaign);
        $this->campaignService->deleteCampaign($campaign->id);
        return response()->json(['message' => 'Borrador eliminado.']);
    }

    private function authorizeCampaign(Request $request, Campaign $campaign): void
    {
        abort_unless($this->access->canAccess($request->user(), $campaign), 403);
    }

    private function businessId(Request $request): int
    {
        $businessId = $request->integer('business_id') ?: ($this->access->businessIds($request->user())[0] ?? 0);
        abort_unless($businessId && ($request->user()->role === 'SUPERADMIN'
            || in_array($businessId, $this->access->businessIds($request->user()), true)), 403, 'Selecciona un negocio autorizado.');
        abort_unless(Business::whereKey($businessId)->exists(), 422, 'El negocio no está disponible.');
        return $businessId;
    }

    private function validatedCampaign(Request $request, ?Campaign $campaign = null): array
    {
        $businessId = $campaign?->business_id ?? $this->businessId($request);
        $data = $request->validate(['subject' => 'required|string|max:255', 'body' => 'required|string|max:1000000',
            'type' => 'required|in:PROMO,NEWS,REMINDER,CUSTOM',
            'promotion_id' => ['nullable', 'integer', Rule::exists(Promotion::class, 'id')->where('business_id', $businessId)]]);
        $data = array_replace($data, $this->validatedAudience($request));
        abort_unless(trim($data['subject']) !== '' && trim(strip_tags($data['body'])) !== '', 422, 'Escribe un asunto y contenido para la campaña.');
        $data['subject'] = trim($data['subject']);
        return $data;
    }

    private function validatedAudience(Request $request): array
    {
        $segment = $request->input('segment');
        if (is_array($segment)) {
            foreach (['is_vip', 'has_membership'] as $key) {
                if (isset($segment[$key]) && in_array($segment[$key], ['true', 'false'], true)) $segment[$key] = $segment[$key] === 'true';
            }
            $request->merge(['segment' => $segment]);
        }
        $data = $request->validate([
            'business_id' => 'nullable|integer|min:1', 'target_role' => 'required|in:CLIENTE,PROFESSIONAL',
            'target_ids' => 'nullable|array|max:10000', 'target_ids.*' => 'integer|distinct|min:1',
            'segment' => 'nullable|array:age_min,age_max,birthday_month,is_vip,tier,min_visits,max_visits,inactive_days,has_membership,joined_after,joined_before',
            'segment.age_min' => 'nullable|integer|min:0|max:120', 'segment.age_max' => 'nullable|integer|min:0|max:120',
            'segment.birthday_month' => 'nullable|integer|min:1|max:12', 'segment.is_vip' => 'nullable|boolean',
            'segment.tier' => 'nullable|string|max:50', 'segment.min_visits' => 'nullable|integer|min:0|max:100000',
            'segment.max_visits' => 'nullable|integer|min:0|max:100000', 'segment.inactive_days' => 'nullable|integer|min:1|max:3650',
            'segment.has_membership' => 'nullable|boolean', 'segment.joined_after' => 'nullable|date_format:Y-m-d',
            'segment.joined_before' => 'nullable|date_format:Y-m-d',
        ]);
        $segment = array_filter($data['segment'] ?? [], fn ($value) => $value !== null && $value !== '');
        foreach ([['age_min', 'age_max'], ['min_visits', 'max_visits'], ['joined_after', 'joined_before']] as [$min, $max]) {
            abort_if(isset($segment[$min], $segment[$max]) && $segment[$min] > $segment[$max], 422, 'El valor mínimo del segmento no puede superar el máximo.');
        }
        abort_if($data['target_role'] !== 'CLIENTE' && $segment !== [], 422, 'Los filtros poblacionales se aplican a clientes.');
        $data['segment'] = $segment;
        $data['target_ids'] = ($data['target_ids'] ?? []) ?: null;
        return $data;
    }
}
