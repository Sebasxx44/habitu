<?php

namespace App\Modules\Booking\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Services\BusinessAccessService;
use Illuminate\Database\Eloquent\Model;

class ReservationContextService
{
    public function resolve(string $kind, int $id, User $user, bool $lock = false): Model
    {
        abort_unless(in_array($kind, ['appointment', 'on-demand'], true), 404);
        $query = $kind === 'appointment' ? Appointment::query() : OnDemandRequest::query();
        $reservation = $query->when($lock, fn ($q) => $q->lockForUpdate())->findOrFail($id);
        abort_unless($this->canAccess($reservation, $user), 403);
        return $reservation;
    }

    public function canAccess(Model $reservation, User $user): bool
    {
        if ($this->isManager($reservation, $user)) return true;
        if ($user->role === User::ROLE_CLIENT) return (int) $reservation->client?->user_id === (int) $user->id;
        return $user->role === User::ROLE_PROFESSIONAL && (int) $reservation->professional?->user_id === (int) $user->id;
    }

    public function isManager(Model $reservation, User $user): bool
    {
        return $user->role === User::ROLE_SUPERADMIN || ($user->role === User::ROLE_ADMIN
            && in_array((int) $reservation->business_id, app(BusinessAccessService::class)->businessIds($user), true));
    }

    public function status(Model $reservation): string
    {
        return $reservation->status instanceof \BackedEnum ? $reservation->status->value : $reservation->status;
    }

    public function participants(Model $reservation): array
    {
        return array_values(array_unique(array_filter([
            $reservation->client?->user_id, $reservation->professional?->user_id, $reservation->business?->owner_user_id,
        ])));
    }
}
