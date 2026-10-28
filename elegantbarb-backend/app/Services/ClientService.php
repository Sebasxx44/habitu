<?php

namespace App\Services;

use App\Interfaces\Repositories\ClientRepositoryInterface;
use App\Interfaces\Services\ClientServiceInterface;

class ClientService implements ClientServiceInterface
{
    protected $repository;

    public function __construct(ClientRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAllClients($shopId = null)
    {
        return $shopId ? $this->repository->getByShop($shopId) : $this->repository->all();
    }

    public function getClientStats($shopId)
    {
        return $this->repository->getStats($shopId);
    }

    public function getClientDetails($id)
    {
        $client = $this->repository->find($id);
        return $client->load(['appointments.service', 'appointments.barber', 'appointments.reviews']);
    }

    public function createClient(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateClient($id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteClient($id)
    {
        return $this->repository->delete($id);
    }
}
