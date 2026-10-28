<?php

namespace App\Repositories;

use App\Models\Permission;
use App\Interfaces\Repositories\PermissionRepositoryInterface;

class PermissionRepository extends BaseRepository implements PermissionRepositoryInterface
{
    public function __construct(Permission $model)
    {
        parent::__construct($model);
    }

    public function getAllGrouped()
    {
        $permissions = $this->model->orderBy('group')->orderBy('name')->get();
        $grouped = $permissions->groupBy('group');
        return compact('permissions', 'grouped');
    }
}
