<?php

namespace App\Interfaces\Services;

interface ClientServiceInterface
{
    public function getAllClients($shopId = null);
    public function getClientStats($shopId);
    public function getClientDetails($id);
    public function createClient(array $data);
    public function updateClient($id, array $data);
    public function deleteClient($id);
}
