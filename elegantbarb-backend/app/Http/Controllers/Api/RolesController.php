<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Interfaces\Services\RoleServiceInterface;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;

class RolesController extends Controller
{
    protected $service;

    public function __construct(RoleServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        return response()->json($this->service->getRoles());
    }

    public function store(Request $request)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:50|unique:roles,slug',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = $this->service->createRole($data);
        return response()->json($role, 201);
    }

    public function update(Request $request, Role $role)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $updatedRole = $this->service->updateRole($role, $data);
        return response()->json($updatedRole);
    }

    public function destroy(Request $request, Role $role)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        try {
            $this->service->deleteRole($role);
            return response()->json(['message' => 'Eliminado']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }
}
