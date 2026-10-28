<?php

namespace App\Services;

use App\Interfaces\Repositories\UserRepositoryInterface;
use App\Interfaces\Services\AuthServiceInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use App\Modules\Business\Models\Business;

class AuthService implements AuthServiceInterface
{
    protected UserRepositoryInterface $repository;

    public function __construct(UserRepositoryInterface $repository, private GoogleIdentityService $googleIdentity, private TwoFactorAuthService $twoFactor)
    {
        $this->repository = $repository;
    }

    public function login(array $credentials)
    {
        $user = $this->repository->findByEmail($credentials['email']);

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Credenciales inválidas']]);
        }

        $this->verifySecondFactor($user, $credentials['two_factor_code'] ?? null);
        $this->persistNormalizedRole($user);
        $token = $user->createToken('api-token', ['*'], now()->addHour())->plainTextToken;

        return [
            'token' => $token,
            'user' => $user,
            'expires_in' => 3600,
        ];
    }

    public function loginWithGoogle(array $data)
    {
        $identity = $this->googleIdentity->verify($data['id_token']);
        $user = User::where('google_id', $identity['sub'])->first()
            ?? $this->repository->findByEmail($identity['email']);
        $isNewUser = $user === null;

        if ($user && $user->google_id && ! hash_equals($user->google_id, $identity['sub'])) {
            throw ValidationException::withMessages(['id_token' => 'La cuenta de Google no corresponde a este usuario.']);
        }

        // Google is authoritative for Gmail and verified Workspace addresses only.
        if ($user && ! $user->google_id && ! str_ends_with(strtolower($identity['email']), '@gmail.com') && empty($identity['hd'])) {
            if (! Hash::check($data['password'] ?? '', $user->password)) {
                throw ValidationException::withMessages(['password' => 'Confirma tu contraseña para acceder con este correo de Google.']);
            }
        }
        if ($user) {
            $this->verifySecondFactor($user, $data['two_factor_code'] ?? null);
            if (! $user->google_id) $user->update(['google_id' => $identity['sub']]);
        } else {
            $user = DB::transaction(fn () => $this->createClientAccount([
                'name' => $identity['name'] ?? $identity['email'],
                'email' => strtolower($identity['email']),
                'password' => Hash::make(bin2hex(random_bytes(32))),
                'role' => User::ROLE_CLIENT,
                'google_id' => $identity['sub'],
            ]));
        }

        $this->persistNormalizedRole($user);
        $token = $user->createToken('google-token', ['*'], now()->addHour())->plainTextToken;
        return ['token' => $token, 'user' => $user, 'is_new_user' => $isNewUser, 'expires_in' => 3600];
    }

    public function register(array $data)
    {
        $data['email'] = strtolower(trim($data['email']));
        if ($this->repository->findByEmail($data['email'])) {
            throw ValidationException::withMessages(['email' => 'Este correo ya está registrado. Inicia sesión o recupera tu contraseña.']);
        }
        $data['role'] = \App\Models\User::ROLE_CLIENT;
        $data['password'] = Hash::make($data['password']);
        unset($data['barber_shop_id'], $data['barber_id'], $data['cliente_id'], $data['password_confirmation'], $data['google_id'], $data['roles']);
        $user = DB::transaction(fn () => $this->createClientAccount($data));
        $token = $user->createToken('api-token', ['*'], now()->addHour())->plainTextToken;

        return ['token' => $token, 'user' => $user, 'expires_in' => 3600];
    }

    public function getMe($user)
    {
        if ($user->role === User::ROLE_ADMIN && ! $user->barber_shop_id) {
            $user->barber_shop_id = Business::where('owner_user_id', $user->id)->value('id');
        }
        if ($user->role === User::ROLE_PROFESSIONAL) {
            $user->barber_id = \App\Modules\People\Models\Professional::where('user_id', $user->id)->value('id');
        }
        if ($user->role === User::ROLE_CLIENT) {
            $user->cliente_id = \App\Modules\People\Models\Client::where('user_id', $user->id)->value('id');
        }
        $user->load('barberShop', 'roles.permissions');
        $permissions = $user->effectivePermissions();

        return [
            'user' => $user,
            'permissions' => $permissions,
        ];
    }

    public function refreshToken($user)
    {
        $user->currentAccessToken()->delete();
        $token = $user->createToken('api-token', ['*'], now()->addHour())->plainTextToken;

        return [
            'token' => $token,
            'expires_in' => 3600,
        ];
    }

    public function getUsersList($filters)
    {
        $users = $this->repository->getFilteredUsers($filters);
        
        // These static calls should ideally be in RoleRepository and BarberShopRepository
        $roles = Role::with('permissions')->orderBy('name')->get();
        $barberShops = Business::orderBy('name')->get();

        return compact('users', 'roles', 'barberShops');
    }

    public function createUser(array $data)
    {
        $roles = $data['roles'] ?? [];
        unset($data['roles']);

        if (isset($data['role'])) {
            $data['role'] = \App\Models\User::normalizeRole($data['role']);
        }

        $data['password'] = Hash::make($data['password']);
        $user = DB::transaction(fn () => $data['role'] === User::ROLE_CLIENT ? $this->createClientAccount($data) : $this->repository->create($data));

        if (!empty($roles)) {
            $user->roles()->sync($roles);
        }

        return $user->load('roles.permissions', 'barberShop');
    }

    public function updateUser($user, array $data)
    {
        if ($user->role === User::ROLE_SUPERADMIN && isset($data['role']) && $data['role'] !== User::ROLE_SUPERADMIN
            && User::where('role', User::ROLE_SUPERADMIN)->count() <= 1) {
            throw ValidationException::withMessages(['role' => 'Debe existir al menos un superadministrador.']);
        }
        return DB::transaction(fn () => $this->applyUserChanges($user, $data));
    }

    private function applyUserChanges(User $user, array $data): User
    {
        $roles = $data['roles'] ?? null;
        unset($data['roles']);

        if (isset($data['role'])) {
            $data['role'] = \App\Models\User::normalizeRole($data['role']);
        }

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $this->repository->update($user->id, $data);
        if ($roles !== null || isset($data['role']) || isset($data['password']) || array_intersect(array_keys($data), ['barber_shop_id', 'barber_id', 'cliente_id'])) {
            $user->tokens()->delete();
        }

        if ($roles !== null) {
            $user->roles()->sync($roles);
        }

        return $user->fresh()->load('roles.permissions', 'barberShop');
    }

    public function deleteUser($user)
    {
        if ($user->role === 'SUPERADMIN') {
            throw new \Exception('No se puede eliminar al superadministrador', 403);
        }
        $this->repository->delete($user->id);
    }

    private function createClientAccount(array $data): User
    {
        $user = $this->repository->create($data);
        return $this->repository->createClientProfileForUser($user, [
            'name' => $data['name'], 'email' => $data['email'], 'business_id' => $data['barber_shop_id'] ?? null, 'loyalty_points' => 0,
        ]);
    }

    private function verifySecondFactor(User $user, ?string $code): void
    {
        if ($this->twoFactor->isEnabled($user)
            && (! $code || (! $this->twoFactor->verify($user, $code) && ! $this->twoFactor->verifyRecoveryCode($user, $code)))) {
            throw ValidationException::withMessages(['two_factor_code' => 'Ingresa un código de autenticación o recuperación válido.']);
        }
    }

    private function persistNormalizedRole($user): void
    {
        $normalized = \App\Models\User::normalizeRole($user->getRawOriginal('role'));
        if ($user->getRawOriginal('role') !== $normalized) {
            $user->forceFill(['role' => $normalized])->save();
        }
    }
}
