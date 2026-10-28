<?php

namespace App\Modules\Marketing\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Marketing\Models\Promotion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PromotionService implements ServiceInterface
{
    public function __construct(
        private Promotion $model
    ) {}

    public function all(array $filters = []): ServiceResponse
    {
        $query = $this->model->newQuery();

        if (! empty($filters['business_id'])) {
            $query->where('business_id', $filters['business_id']);
        }

        $promotions = $query->orderByDesc('created_at')->get();

        return ServiceResponse::success($promotions, 'Promotions retrieved');
    }

    public function find(int $id): ServiceResponse
    {
        $promotion = $this->model->find($id);

        if (! $promotion) {
            return ServiceResponse::notFound('Promotion');
        }

        return ServiceResponse::success($promotion, 'Promotion found');
    }

    public function create(array $data): ServiceResponse
    {
        $promotion = DB::transaction(function () use ($data) {
            return $this->model->create($data);
        });

        return ServiceResponse::success($promotion, 'Promotion created', 201);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $promotion = $this->model->find($id);

        if (! $promotion) {
            return ServiceResponse::notFound('Promotion');
        }

        DB::transaction(function () use ($promotion, $data) {
            $promotion->update($data);
        });

        return ServiceResponse::success($promotion, 'Promotion updated');
    }

    public function delete(int $id): ServiceResponse
    {
        $promotion = $this->model->find($id);

        if (! $promotion) {
            return ServiceResponse::notFound('Promotion');
        }

        DB::transaction(function () use ($promotion) {
            $promotion->delete();
        });

        return ServiceResponse::success(null, 'Promotion deleted');
    }

    public function validateCode(string $code, int $userId, float $subtotal, ?int $businessId): ServiceResponse
    {
        $promotion = $this->model->whereRaw('LOWER(promo_code) = ?', [mb_strtolower(trim($code))])
            ->whereHas('business', fn ($query) => $query->where('is_active', true))->first();

        if (! $promotion) {
            return ServiceResponse::error('Invalid promotion code');
        }

        if (! $promotion->isValid()) {
            return ServiceResponse::error('Promotion is not valid or has expired');
        }

        if (! $promotion->canUseBy($userId)) {
            return ServiceResponse::error('Usage limit reached for this promotion');
        }

        if ($businessId !== null && $promotion->business_id !== null && (int) $promotion->business_id !== $businessId) {
            return ServiceResponse::error('Promotion not valid for this business');
        }

        if ($subtotal < (float) ($promotion->min_purchase ?? 0)) {
            return ServiceResponse::error('No se alcanza el monto mínimo de esta promoción.', null, 422);
        }

        $discount = $promotion->calculateDiscount($subtotal);

        return ServiceResponse::success([
            'promotion_id' => $promotion->id,
            'code' => $promotion->promo_code,
            'name' => $promotion->title,
            'type' => $promotion->type,
            'value' => $promotion->discount,
            'discount' => $discount,
            'subtotal' => $subtotal,
            'final_total' => round($subtotal - $discount, 2),
        ], 'Promotion validated');
    }

    public function applyCode(string $code, int $userId, Model $usableModel, float $subtotal): ServiceResponse
    {
        $businessId = method_exists($usableModel, 'business_id') || isset($usableModel->business_id)
            ? (int) $usableModel->business_id
            : null;

        $validateResponse = $this->validateCode($code, $userId, $subtotal, $businessId);

        if (! $validateResponse->success) {
            return $validateResponse;
        }

        $promotion = $this->model->whereRaw('LOWER(promo_code) = ?', [mb_strtolower(trim($code))])->first();
        $discount = $promotion->calculateDiscount($subtotal);

        DB::transaction(function () use ($promotion, $userId, $usableModel, $discount) {
            $client = \App\Modules\People\Models\Client::where('user_id', $userId)->first();
            if ($client) {
                $promotion->usages()->create([
                    'client_id' => $client->id,
                    'appointment_id' => $usableModel instanceof \App\Modules\Booking\Models\Appointment ? $usableModel->id : null,
                    'saved_amount' => $discount,
                ]);
            }

            $promotion->increment('usage_count');
        });

        return ServiceResponse::success([
            'discount' => $discount,
            'final_total' => round($subtotal - $discount, 2),
        ], 'Promotion applied successfully');
    }

    public function getActive(?int $businessId): ServiceResponse
    {
        $query = $this->model->with('services:id,name')->activeAndValid()
            ->whereHas('business', fn ($business) => $business->where('is_active', true));

        if ($businessId !== null) {
            $query->where('business_id', $businessId);
        }

        $promotions = $query->get();

        return ServiceResponse::success($promotions, 'Active promotions retrieved');
    }
}
