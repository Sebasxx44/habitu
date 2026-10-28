<?php

namespace App\Modules\Business\Repositories;

use App\Modules\Business\Models\Business;
use App\Repositories\BaseRepository;

class BusinessRepository extends BaseRepository
{
    public function __construct(Business $model)
    {
        parent::__construct($model);
    }

    public function findBySlug(string $slug): ?Business
    {
        return $this->model->where('slug', $slug)->first();
    }

    public function getByCategory(int $categoryId)
    {
        return $this->model->where('business_category_id', $categoryId)
            ->where('is_active', true)
            ->get();
    }

    public function search(string $query, ?int $categoryId = null, ?float $lat = null, ?float $lng = null, ?float $radius = null)
    {
        return app(\App\Modules\Business\Services\DiscoveryService::class)->search(array_filter(['q' => $query, 'category_id' => $categoryId, 'lat' => $lat, 'lng' => $lng, 'radius' => $radius], fn ($value) => $value !== null))->data;
    }
}
