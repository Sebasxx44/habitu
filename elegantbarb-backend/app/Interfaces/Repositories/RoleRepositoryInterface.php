<?php

namespace App\Interfaces\Repositories;

interface RoleRepositoryInterface extends BaseRepositoryInterface
{
    public function getAllWithPermissions();
}
