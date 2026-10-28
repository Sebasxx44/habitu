<?php

namespace App\Modules\Marketing\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Business\Models\Business;
use App\Modules\Marketing\Services\PromotionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Catalog\Models\Service;

class PromotionController extends Controller
{
    public function __construct(
        private PromotionService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $businessId = $request->input('business_id') ? (int) $request->input('business_id') : null;

        $response = $this->service->getActive($businessId);
        return $response->toJsonResponse();
    }

    public function validateCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:255',
            'subtotal' => 'required|numeric|min:0',
            'business_id' => ['nullable', 'integer', Rule::exists(Business::class, 'id')],
        ]);

        $response = $this->service->validateCode(
            $data['code'],
            (int) $request->user()->id,
            (float) $data['subtotal'],
            $data['business_id'] ?? null
        );

        return $response->toJsonResponse();
    }

    public function managed(Request $request): JsonResponse
    {
        $query = Promotion::with('services')->withCount('usages as redemptions_count');
        if ($request->user()->role !== 'SUPERADMIN') {
            $ids = app(\App\Services\BusinessAccessService::class)->businessIds($request->user());
            $query->whereIn('business_id', $ids);
        }
        return ServiceResponse::success($query->orderByDesc('created_at')->get())->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $promotion = DB::transaction(fn () => $this->persistPromotion(new Promotion(), $data));
        return ServiceResponse::success($promotion, 'Promoción creada', 201)->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $promotion = Promotion::findOrFail($id);
        $request->merge(['business_id' => $promotion->business_id]);
        $data = $this->validatedData($request, $id);
        $promotion = DB::transaction(fn () => $this->persistPromotion($promotion, $data));
        return ServiceResponse::success($promotion, 'Promoción actualizada')->toJsonResponse();
    }

    public function destroy(int $id): JsonResponse
    {
        $promotion = Promotion::findOrFail($id);
        // Keep redemption history for financial traceability.
        $promotion->update(['is_active' => false]);
        return ServiceResponse::success(null, 'Promoción desactivada')->toJsonResponse();
    }

    public function stats(int $id): JsonResponse
    {
        $promotion = Promotion::findOrFail($id);
        $redemptions = $promotion->usages();
        return ServiceResponse::success([
            'total_redemptions' => (clone $redemptions)->count(),
            'total_saved' => (float) (clone $redemptions)->sum('saved_amount'),
            'unique_clients' => (clone $redemptions)->distinct('client_id')->count('client_id'),
            'redemptions_by_month' => (clone $redemptions)->selectRaw("to_char(created_at, 'YYYY-MM') as month, count(*) as total")
                ->groupByRaw("to_char(created_at, 'YYYY-MM')")->orderBy('month')->pluck('total', 'month'),
            'recent_redemptions' => (clone $redemptions)->with('client:id,name')->orderByDesc('created_at')->limit(20)->get(),
        ])->toJsonResponse();
    }

    private function validatedData(Request $request, ?int $id = null): array
    {
        $code = trim((string) $request->input('promo_code', $request->input('code', '')));
        $request->merge([
            'title' => $request->input('title', $request->input('name')),
            'promo_code' => $code === '' ? null : mb_strtoupper($code),
            'discount' => $request->input('discount', $request->input('value')),
            'start_date' => $request->input('start_date', $request->input('starts_at')),
            'end_date' => $request->input('end_date', $request->input('ends_at')),
            'is_active' => $request->input('is_active', $request->input('active', true)),
            'type' => match ($request->input('type')) { 'PORCENTAJE' => 'PERCENTAGE', 'FIJO', 'FIXED' => 'FIXED_AMOUNT', default => $request->input('type') },
        ]);
        $data = $request->validate([
            'business_id' => ['required', 'integer', Rule::exists(Business::class, 'id')],
            'title' => 'required|string|max:255', 'description' => 'nullable|string|max:5000',
            'promo_code' => ['nullable', 'string', 'max:100', Rule::unique(Promotion::class, 'promo_code')->ignore($id)],
            'discount' => ['required', 'numeric', 'min:0', $request->type === 'PERCENTAGE' ? 'max:100' : 'max:99999999'],
            'type' => 'required|in:PERCENTAGE,FIXED_AMOUNT',
            'start_date' => 'required|date', 'end_date' => 'required|date|after_or_equal:start_date',
            'min_purchase' => 'nullable|numeric|min:0', 'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1', 'per_user_limit' => 'nullable|integer|min:1',
            'is_active' => 'boolean', 'image_url' => 'nullable|string|max:2000000',
            'services' => 'sometimes|array|max:100',
            'services.*.id' => ['required', 'integer', 'distinct', Rule::exists(Service::class, 'id')->where('business_id', $request->business_id)],
            'services.*.discount' => 'required|numeric|min:0|max:99999999',
            'services.*.type' => 'required|in:PORCENTAJE,FIJO,PERCENTAGE,FIXED_AMOUNT',
        ]);
        foreach ($data['services'] ?? [] as $service) {
            if (in_array($service['type'], ['PORCENTAJE', 'PERCENTAGE'], true) && $service['discount'] > 100) {
                throw \Illuminate\Validation\ValidationException::withMessages(['services' => 'El porcentaje no puede superar 100.']);
            }
        }
        if ($data['promo_code'] !== null && Promotion::whereRaw('LOWER(promo_code) = ?', [mb_strtolower($data['promo_code'])])
            ->when($id, fn ($query) => $query->whereKeyNot($id))->exists()) {
            throw \Illuminate\Validation\ValidationException::withMessages(['promo_code' => 'Este código ya está en uso.']);
        }
        if ($id && isset($data['usage_limit']) && $data['usage_limit'] < (int) Promotion::whereKey($id)->value('usage_count')) {
            throw \Illuminate\Validation\ValidationException::withMessages(['usage_limit' => 'El límite no puede ser menor que los canjes registrados.']);
        }
        return $data;
    }

    private function persistPromotion(Promotion $promotion, array $data): Promotion
    {
        $services = $data['services'] ?? null;
        unset($data['services']);
        $promotion->fill($data)->save();
        if ($services !== null) {
            $pivot = [];
            foreach ($services as $service) {
                $pivot[$service['id']] = [
                    'discount' => $service['discount'],
                    'type' => in_array($service['type'], ['PORCENTAJE', 'PERCENTAGE'], true) ? 'PERCENTAGE' : 'FIXED_AMOUNT',
                ];
            }
            $promotion->services()->sync($pivot);
        }
        return $promotion->load('services');
    }
}
