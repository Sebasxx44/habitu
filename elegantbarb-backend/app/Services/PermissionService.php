<?php

namespace App\Services;

use App\Interfaces\Repositories\PermissionRepositoryInterface;
use App\Interfaces\Services\PermissionServiceInterface;

class PermissionService implements PermissionServiceInterface
{
    protected $repository;

    public function __construct(PermissionRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getPermissions()
    {
        return $this->repository->getAllGrouped();
    }
}
