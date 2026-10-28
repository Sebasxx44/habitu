<?php

namespace App\Services;

use App\Interfaces\Repositories\BarberShopRepositoryInterface;
use App\Interfaces\Services\BarberShopServiceInterface;

class BarberShopService implements BarberShopServiceInterface
{
    protected $repository;

    public function __construct(BarberShopRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getShopsList($filters)
    {
        $shops = $this->repository->getFilteredShops($filters);
        $locations = $this->repository->getCountriesAndCities();

        return array_merge(['shops' => $shops], $locations);
    }

    public function createShop(array $data, ?array $licenseData = null)
    {
        $shop = $this->repository->create($data);

        return $shop->load(['branches']);
    }

    public function getShopDetails($shopId)
    {
        $shop = $this->repository->find($shopId);
        return $shop->load(['branches', 'professionals', 'clients', 'services']);
    }

    public function updateShop($shopId, array $data, ?array $licenseData = null)
    {
        $shop = $this->repository->update($shopId, $data);

        return $shop->load(['branches']);
    }

    public function deleteShop($shopId)
    {
        return $this->repository->delete($shopId);
    }
}