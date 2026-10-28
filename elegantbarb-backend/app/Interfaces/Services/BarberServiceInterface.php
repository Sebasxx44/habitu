<?php

namespace App\Interfaces\Services;

interface BarberServiceInterface
{
    public function getAllBarbers($shopId = null);
    public function getBarberStats($shopId);
    public function getBarberDetails($id);
    public function createBarber(array $data);
    public function updateBarber($id, array $data);
    public function deleteBarber($id);
}
