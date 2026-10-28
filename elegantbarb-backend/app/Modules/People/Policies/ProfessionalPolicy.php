<?php

namespace App\Modules\People\Policies;

use App\Models\User;
use App\Modules\People\Models\Professional;

class ProfessionalPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Professional $professional): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA']);
    }

    public function update(User $user, Professional $professional): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA') {
            $business = $professional->business;
            return $business && $business->owner_user_id === $user->id;
        }
        if ($user->role === 'PROFESSIONAL' && $professional->user_id === $user->id) return true;

        return false;
    }

    public function delete(User $user, Professional $professional): bool
    {
        if ($user->role === 'SUPERADMIN') return true;
        if ($user->role === 'ADMIN_BARBERIA') {
            $business = $professional->business;
            return $business && $business->owner_user_id === $user->id;
        }

        return false;
    }
}
