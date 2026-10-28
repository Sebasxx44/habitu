<?php

namespace App\Interfaces\Services;

interface RoleServiceInterface
{
    public function getRoles();
    public function createRole(array $data);
    public function updateRole($role, array $data);
    public function deleteRole($role);
}
