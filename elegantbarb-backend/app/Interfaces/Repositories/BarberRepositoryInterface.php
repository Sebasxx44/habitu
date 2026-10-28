<?php

namespace App\Interfaces\Repositories;

interface BarberRepositoryInterface extends BaseRepositoryInterface
{
    public function getByShop($shopId);
    public function getStats($shopId);
}
