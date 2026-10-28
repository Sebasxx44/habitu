<?php

namespace App\Services;

use App\Interfaces\Repositories\ServiceRepositoryInterface;
use App\Interfaces\Services\ServiceServiceInterface;

class ServiceService implements ServiceServiceInterface
{
    protected $repository;

    public function __construct(ServiceRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAllServices()
    {
        return $this->repository->all();
    }

    public function getService($service)
    {
        return $service;
    }

    public function createService(array $data)
    {
        $data['duration_minutes'] = $data['duration'];
        unset($data['duration']);

        return $this->repository->create($data);
    }

    public function updateService($service, array $data)
    {
        if (isset($data['duration'])) {
            $data['duration_minutes'] = $data['duration'];
            unset($data['duration']);
        }

        return $this->repository->update($service->id, $data);
    }

    public function deleteService($service)
    {
        return $this->repository->delete($service->id);
    }

    public function getServiceStats($service)
    {
        return $this->repository->getServiceStats($service);
    }
}
