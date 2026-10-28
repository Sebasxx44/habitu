<?php

namespace App\Modules\People\Services;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;

final class OperationsAccess
{
    public function business(User $user, int $businessId, bool $write = false): Business
    {
        $business = Business::findOrFail($businessId);
        abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN, User::ROLE_PROFESSIONAL], true), 403);
        abort_unless(app(BusinessAccessService::class)->canAccess($user, $business), 403);
        if ($user->role === User::ROLE_ADMIN) abort_unless($user->hasEffectivePermission($write ? 'barbers.edit' : 'barbers.view'), 403);
        return $business;
    }

    public function professional(User $user, int $id, bool $write = false): Professional
    {
        $professional = Professional::findOrFail($id);
        $this->business($user, $professional->business_id, $write);
        if ($user->role === User::ROLE_PROFESSIONAL) abort_unless((int) $professional->user_id === $user->id, 403);
        return $professional;
    }
}
