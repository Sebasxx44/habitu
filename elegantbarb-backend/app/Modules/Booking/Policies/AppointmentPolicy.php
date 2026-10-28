<?php

namespace App\Modules\Booking\Policies;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;

class AppointmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Appointment $appointment): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA') {
            return $appointment->business->owner_user_id === $user->id;
        }
        if ($user->role === 'PROFESSIONAL') {
            return $appointment->professional_id === $user->barber_id;
        }
        if ($user->role === 'CLIENTE') {
            return $appointment->client_id === $user->cliente_id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA', 'CLIENTE']);
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $this->view($user, $appointment);
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA') {
            return $appointment->business->owner_user_id === $user->id;
        }

        return false;
    }

    public function cancel(User $user, Appointment $appointment): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA') {
            return $appointment->business->owner_user_id === $user->id;
        }
        if ($user->role === 'CLIENTE') {
            return $appointment->client_id === $user->cliente_id;
        }

        return false;
    }
}
