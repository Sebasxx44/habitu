<?php

namespace App\Modules\Business\Policies;

use App\Models\User;
use App\Modules\Business\Models\Business;

class BusinessPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Cualquiera puede ver negocios
    }

    public function view(User $user, Business $business): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA']);
    }

    public function update(User $user, Business $business): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA' && $business->owner_user_id === $user->id) return true;

        return false;
    }

    public function delete(User $user, Business $business): bool
    {
        return $this->update($user, $business);
    }

    public function manage(User $user, Business $business): bool
    {
        return $this->update($user, $business);
    }
}
