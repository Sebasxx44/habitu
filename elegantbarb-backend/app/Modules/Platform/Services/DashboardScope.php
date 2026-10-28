<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Database\Eloquent\Builder;

/** Every overview query starts with the authenticated user's scope. */
class DashboardScope
{
    public function appointments(User $user): Builder
    {
        $query = Appointment::query();

        return match ($user->role) {
            User::ROLE_SUPERADMIN => $query,
            User::ROLE_ADMIN => $query->whereIn('business_id', $this->businesses($user)->select('id')),
            User::ROLE_PROFESSIONAL => $query->whereIn('professional_id', Professional::where('user_id', $user->id)->select('id')),
            User::ROLE_CLIENT => $query->whereIn('client_id', $this->clients($user)->select('id')),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public function businesses(User $user): Builder
    {
        return Business::query()->when(
            $user->role !== User::ROLE_SUPERADMIN,
            fn (Builder $query) => $query->where(fn (Builder $owned) => $owned->where('owner_user_id', $user->id)->orWhere('id', $user->barber_shop_id ?? 0))
        );
    }

    public function clients(User $user): Builder
    {
        return Client::where('user_id', $user->id);
    }

    public function name(User $user): string
    {
        return match ($user->role) {
            User::ROLE_SUPERADMIN => 'Toda la plataforma',
            User::ROLE_ADMIN => $this->businesses($user)->count() === 1
                ? (string) $this->businesses($user)->value('name') : 'Tus negocios',
            User::ROLE_PROFESSIONAL => 'Tu actividad profesional',
            default => 'Tu espacio personal',
        };
    }
}
