<?php

namespace App\Services;

use App\Interfaces\Repositories\RoleRepositoryInterface;
use App\Interfaces\Services\RoleServiceInterface;

class RoleService implements RoleServiceInterface
{
    protected $repository;

    public function __construct(RoleRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getRoles()
    {
        return $this->repository->getAllWithPermissions();
    }

    public function createRole(array $data)
    {
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);

        $role = $this->repository->create($data);
        
        if (!empty($permissions)) {
            $role->permissions()->sync($permissions);
        }

        return $role->load('permissions');
    }

    public function updateRole($role, array $data)
    {
        $permissions = $data['permissions'] ?? null;
        unset($data['permissions']);

        $this->repository->update($role->id, $data);
        
        if ($permissions !== null) {
            $role->permissions()->sync($permissions);
        }

        return $role->fresh()->load('permissions');
    }

    public function deleteRole($role)
    {
        if ($role->type === 'system') {
            throw new \Exception('No se puede eliminar rol del sistema', 403);
        }
        $this->repository->delete($role->id);
    }
}
