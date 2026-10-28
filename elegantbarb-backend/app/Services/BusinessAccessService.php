<?php

namespace App\Services;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Database\Eloquent\Model;

class BusinessAccessService
{
    public function businessIds(User $user): array
    {
        if ($user->role === User::ROLE_ADMIN) {
            return Business::where('owner_user_id', $user->id)
                ->orWhere('id', $user->barber_shop_id ?? 0)->pluck('id')->map(fn ($id) => (int) $id)->all();
        }
        if ($user->role === User::ROLE_PROFESSIONAL) {
            return Professional::where('user_id', $user->id)->pluck('business_id')->map(fn ($id) => (int) $id)->all();
        }
        return [];
    }

    public function clientId(User $user): ?int
    {
        return Client::where('user_id', $user->id)->value('id');
    }

    public function canAccess(User $user, Model $record): bool
    {
        if ($user->role === User::ROLE_SUPERADMIN) return true;
        if ($record instanceof \App\Modules\Subscriptions\Models\UserSubscription) return (int) $record->user_id === $user->id;
        if ($user->role === User::ROLE_CLIENT) {
            if ($record instanceof Client) return (int) $record->user_id === $user->id;
            if ($record->getAttribute('user_id') !== null) return (int) $record->user_id === $user->id;
            $clientId = $this->clientId($user);
            return $record->getAttribute('client_id') !== null
                && Client::whereKey($record->getAttribute('client_id'))->where('user_id', $user->id)->exists();
        }
        $businessId = $record instanceof Business ? $record->id : $record->getAttribute('business_id');
        return $businessId !== null && in_array((int) $businessId, $this->businessIds($user), true);
    }
}
