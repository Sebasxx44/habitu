<?php

namespace App\Services;

use App\Interfaces\Repositories\BarberRepositoryInterface;
use App\Interfaces\Services\BarberServiceInterface;

class BarberService implements BarberServiceInterface
{
    protected $repository;

    public function __construct(BarberRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAllBarbers($shopId = null)
    {
        return $shopId ? $this->repository->getByShop($shopId) : $this->repository->all();
    }

    public function getBarberStats($shopId)
    {
        return $this->repository->getStats($shopId);
    }

    public function getBarberDetails($id)
    {
        $barber = $this->repository->find($id);
        return $barber->load(['appointments.service', 'appointments.client']);
    }

    public function createBarber(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateBarber($id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteBarber($id)
    {
        return $this->repository->delete($id);
    }
}
