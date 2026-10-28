<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\AuthServiceInterface;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected AuthServiceInterface $service;

    public function __construct(AuthServiceInterface $service)
    {
        $this->service = $service;
    }

    public function configuration(): JsonResponse
    {
        $clientId = config('services.google.client_id');
        return response()->json([
            'google_client_id' => is_string($clientId) && trim($clientId) !== '' ? $clientId : null,
        ])->header('Cache-Control', 'no-store');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|string|max:255',
            'password' => 'required|string|max:255',
            'two_factor_code' => 'nullable|string|max:16',
        ]);

        $response = $this->service->login($credentials);
        return response()->json($response);
    }

    public function loginWithGoogle(Request $request)
    {
        $data = $request->validate([
            'id_token' => 'required|string|max:10000',
            'two_factor_code' => 'nullable|string|max:16',
            'password' => 'nullable|string|max:255',
        ]);

        $response = $this->service->loginWithGoogle($data);
        return response()->json($response);
    }

    public function register(Request $request)
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users',
            'password' => 'required|string|min:8|max:255',
            'password_confirmation' => 'sometimes|required|string|same:password',
            'role' => 'nullable|in:CLIENTE',
        ]);
        $data['role'] = User::ROLE_CLIENT;

        $response = $this->service->register($data);
        return response()->json($response, 201);
    }

    public function me(Request $request)
    {
        $response = $this->service->getMe($request->user());
        return response()->json($response);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada']);
    }

    public function refreshToken(Request $request)
    {
        $response = $this->service->refreshToken($request->user());
        return response()->json($response);
    }

    public function users(Request $request)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        $response = $this->service->getUsersList($request->all());
        return response()->json($response);
    }

    public function updateUser(Request $request, User $user)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:SUPERADMIN,ADMIN_BARBERIA,PROFESSIONAL,CLIENTE',
            'barber_shop_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')],
            'barber_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Professional::class, 'id')],
            'cliente_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Client::class, 'id')],
            'password' => 'nullable|min:6',
            'roles' => 'sometimes|array',
            'roles.*' => 'exists:roles,id',
        ]);

        $updatedUser = $this->service->updateUser($user, $data);
        return response()->json($updatedUser);
    }

    public function createUser(Request $request)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role' => 'required|in:SUPERADMIN,ADMIN_BARBERIA,PROFESSIONAL,CLIENTE',
            'barber_shop_id' => 'nullable|integer',
            'barber_id' => 'nullable|integer',
            'cliente_id' => 'nullable|integer',
            'roles' => 'sometimes|array',
            'roles.*' => 'exists:roles,id',
        ]);

        $newUser = $this->service->createUser($data);
        return response()->json($newUser, 201);
    }

    public function deleteUser(Request $request, User $user)
    {
        abort_unless($request->user()?->role === User::ROLE_SUPERADMIN, 403);

        try {
            $this->service->deleteUser($user);
            return response()->json(['message' => 'Usuario eliminado']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
        }
    }
}
