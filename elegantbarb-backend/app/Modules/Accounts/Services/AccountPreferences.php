<?php

namespace App\Modules\Accounts\Services;

use App\Models\User;

final class AccountPreferences
{
    public static function forUser(User $user): array
    {
        return array_replace(['language' => 'es', 'theme' => 'system', 'appointment_reminders' => true, 'email_notifications' => true], $user->preferences ?? []);
    }

    public static function allows(?User $user, string $key): bool
    {
        return ! $user || (self::forUser($user)[$key] ?? true) === true;
    }
}
