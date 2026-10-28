<?php

namespace App\Interfaces\Repositories;

interface ClientRepositoryInterface extends BaseRepositoryInterface
{
    public function getByShop($shopId);
    public function getStats($shopId);
}
