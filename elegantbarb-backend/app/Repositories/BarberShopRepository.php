<?php

namespace App\Repositories;

use App\Modules\Business\Models\Business;
use App\Interfaces\Repositories\BarberShopRepositoryInterface;

class BarberShopRepository extends BaseRepository implements BarberShopRepositoryInterface
{
    public function __construct(Business $model)
    {
        parent::__construct($model);
    }

    public function getFilteredShops($filters)
    {
        $query = $this->model->with(['branches', 'services', 'reviews.client']);

        if (!empty($filters['country_id'])) {
            $query->whereHas('branches', fn($q) => $q->where('country_id', $filters['country_id']));
        }
        if (!empty($filters['city_id'])) {
            $query->whereHas('branches', fn($q) => $q->where('city_id', $filters['city_id']));
        }
        if (!empty($filters['status']) && $filters['status'] === 'active') {
            $query->where('is_active', true);
        } elseif (!empty($filters['status']) && $filters['status'] === 'expired') {
            $query->where('is_active', false);
        }
        if (!empty($filters['search'])) {
            $query->where('name', 'like', '%' . $filters['search'] . '%');
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function getCountriesAndCities()
    {
        return [
            'countries' => collect([]),
            'cities' => collect([])
        ];
    }
}