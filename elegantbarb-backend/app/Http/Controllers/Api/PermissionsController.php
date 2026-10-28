<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Interfaces\Services\PermissionServiceInterface;
use App\Models\User;
use Illuminate\Http\Request;

class PermissionsController extends Controller
{
    protected $service;

    public function __construct(PermissionServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        return response()->json($this->service->getPermissions());
    }
}
