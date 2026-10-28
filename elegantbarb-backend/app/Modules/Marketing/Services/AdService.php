<?php

namespace App\Modules\Marketing\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Marketing\Models\Ad;
use Illuminate\Support\Facades\DB;

class AdService implements ServiceInterface
{
    public function __construct(
        private Ad $model
    ) {}

    public function all(array $filters = []): ServiceResponse
    {
        $query = $this->model->newQuery();

        if (! empty($filters['placement'])) {
            $query->where('placement', $filters['placement']);
        }

        if (! empty($filters['business_id'])) {
            $query->where('business_id', $filters['business_id']);
        }

        $ads = $query->orderByDesc('created_at')->get();

        return ServiceResponse::success($ads, 'Ads retrieved');
    }

    public function find(int $id): ServiceResponse
    {
        $ad = $this->model->find($id);

        if (! $ad) {
            return ServiceResponse::notFound('Ad');
        }

        return ServiceResponse::success($ad, 'Ad found');
    }

    public function create(array $data): ServiceResponse
    {
        $ad = DB::transaction(function () use ($data) {
            return $this->model->create($data);
        });

        return ServiceResponse::success($ad, 'Ad created', 201);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $ad = $this->model->find($id);

        if (! $ad) {
            return ServiceResponse::notFound('Ad');
        }

        DB::transaction(function () use ($ad, $data) {
            $ad->update($data);
        });

        return ServiceResponse::success($ad, 'Ad updated');
    }

    public function delete(int $id): ServiceResponse
    {
        $ad = $this->model->find($id);

        if (! $ad) {
            return ServiceResponse::notFound('Ad');
        }

        DB::transaction(function () use ($ad) {
            $ad->delete();
        });

        return ServiceResponse::success(null, 'Ad deleted');
    }

    public function getAdsForPlacement(string $placement, ?int $userId): ServiceResponse
    {
        $placement = $placement === 'HOME_BANNER' ? 'HOME' : $placement;
        $ads = $this->model->activeForPlacement($placement)->with('business')->limit(8)->get();
        return ServiceResponse::success($ads->map(fn ($ad) => app(AdMeasurementService::class)->delivery($ad, $userId)), 'Anuncios patrocinados');
    }

    public function recordClick(int $adId, ?int $userId): ServiceResponse
    {
        $ad = $this->model->find($adId);

        if (! $ad) {
            return ServiceResponse::notFound('Ad');
        }

        DB::transaction(function () use ($ad, $userId) {
            $ad->recordClick($userId);
        });

        return ServiceResponse::success(null, 'Click recorded');
    }

    public function getMyAds(int $businessId): ServiceResponse
    {
        $ads = $this->model
            ->where('business_id', $businessId)
            ->orderByDesc('created_at')
            ->get();

        return ServiceResponse::success($ads, 'My ads retrieved');
    }
}
