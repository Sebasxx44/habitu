<?php

namespace App\Repositories;

use App\Models\Role;
use App\Interfaces\Repositories\RoleRepositoryInterface;

class RoleRepository extends BaseRepository implements RoleRepositoryInterface
{
    public function __construct(Role $model)
    {
        parent::__construct($model);
    }

    public function getAllWithPermissions()
    {
        return $this->model->with('permissions')->get();
    }
}
