<?php

namespace App\Interfaces\Repositories;

interface PermissionRepositoryInterface extends BaseRepositoryInterface
{
    public function getAllGrouped();
}
