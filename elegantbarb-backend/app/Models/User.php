<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\Client;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    public const ROLE_SUPERADMIN = 'SUPERADMIN';
    public const ROLE_ADMIN = 'ADMIN_BARBERIA';
    public const ROLE_PROFESSIONAL = 'PROFESSIONAL';
    public const ROLE_CLIENT = 'CLIENTE';
    public const PROFESSIONAL_ALIASES = ['PROFESSIONAL', 'PROFESIONAL', 'BARBERO'];

    protected $fillable = ['name', 'email', 'password', 'role', 'barber_shop_id', 'barber_id', 'cliente_id', 'google_id'];

    protected $hidden = ['password', 'remember_token', 'google_id', 'avatar_path'];

    protected $appends = ['avatar_url'];

    protected $casts = [
        'role' => 'string', 'preferences' => 'array',
    ];

    protected $table = 'users';

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->avatar_path) : null;
    }

    public static function normalizeRole(?string $role): string
    {
        return match ($role) {
            'SUPERADMIN' => self::ROLE_SUPERADMIN,
            'ADMIN_BARBERIA', 'BUSINESS_ADMIN' => self::ROLE_ADMIN,
            'PROFESSIONAL', 'PROFESIONAL', 'BARBERO' => self::ROLE_PROFESSIONAL,
            'CLIENTE', 'CLIENT' => self::ROLE_CLIENT,
            default => self::ROLE_CLIENT,
        };
    }

    public function setRoleAttribute(?string $role): void
    {
        $this->attributes['role'] = self::normalizeRole($role);
    }

    public function getRoleAttribute(?string $role): string
    {
        return self::normalizeRole($role);
    }

    public function barberShop(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'barber_shop_id');
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Professional::class, 'barber_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'cliente_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'cliente_id');
    }

    public function effectivePermissions(): array
    {
        if ($this->role === self::ROLE_SUPERADMIN) return Permission::pluck('slug')->all();
        $assigned = $this->roles()->with('permissions')->get();
        if ($assigned->isNotEmpty()) return $assigned->flatMap(fn ($role) => $role->permissions->pluck('slug'))->unique()->values()->all();

        $systemSlug = match ($this->role) {
            self::ROLE_ADMIN => 'admin', self::ROLE_PROFESSIONAL => 'professional', default => 'client',
        };
        $systemRole = Role::with('permissions')->where('slug', $systemSlug)->first();
        if ($systemRole) return $systemRole->permissions->pluck('slug')->all();

        // Existing installations may not have seeded RBAC yet; role ceilings and tenant checks still apply.
        return match ($this->role) {
            self::ROLE_ADMIN => [
                'barbershops.view', 'barbershops.create', 'barbershops.edit', 'barbershops.delete',
                'barbers.view', 'barbers.create', 'barbers.edit', 'barbers.delete',
                'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
                'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel',
                'services.view', 'services.manage', 'reports.view', 'reports.export', 'settings.profile', 'settings.manage',
            ],
            self::ROLE_PROFESSIONAL => ['appointments.view', 'appointments.edit'],
            default => ['appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel', 'services.view', 'settings.profile'],
        };
    }

    public function hasEffectivePermission(string $permission): bool
    {
        return $this->role === self::ROLE_SUPERADMIN || in_array($permission, $this->effectivePermissions(), true);
    }

    public function configurations(): HasMany
    {
        return $this->hasMany(UserConfiguration::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }
}
