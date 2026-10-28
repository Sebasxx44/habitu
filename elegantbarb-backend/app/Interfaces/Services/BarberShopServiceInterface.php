<?php

namespace App\Interfaces\Services;

interface BarberShopServiceInterface
{
    public function getShopsList($filters);
    public function createShop(array $data, ?array $licenseData = null);
    public function getShopDetails($shopId);
    public function updateShop($shopId, array $data, ?array $licenseData = null);
    public function deleteShop($shopId);
}
