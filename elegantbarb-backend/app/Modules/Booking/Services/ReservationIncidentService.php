<?php

namespace App\Modules\Booking\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReservationIncidentService
{
    public function __construct(private ReservationContextService $context) {}

    public function list(string $kind, int $id, User $user): ServiceResponse
    {
        $reservation = $this->context->resolve($kind, $id, $user);
        $incidents = DB::table('booking.reservation_incidents')->where('reservation_kind', $kind)->where('reservation_id', $id)
            ->orderByDesc('id')->get();
        return ServiceResponse::success(['incidents' => $incidents,
            'can_manage' => $this->context->isManager($reservation, $user),
            'can_issue_pin' => (int) $reservation->client?->user_id === $user->id,
            'can_verify_pin' => $this->context->isManager($reservation, $user) || $user->role === User::ROLE_PROFESSIONAL,
            'checked_in_at' => $kind === 'appointment' ? $reservation->checked_in_at : $reservation->arrived_at,
        ]);
    }

    public function create(string $kind, int $id, User $user, array $data): ServiceResponse
    {
        $reservation = $this->context->resolve($kind, $id, $user);
        $caseId = DB::table('booking.reservation_incidents')->insertGetId([
            'case_number' => 'HB-'.Str::upper(Str::random(10)), 'reservation_kind' => $kind, 'reservation_id' => $id,
            'business_id' => $reservation->business_id, 'reported_by' => $user->id,
            'assigned_to' => $reservation->business?->owner_user_id,
            'category' => $data['category'], 'description' => $data['description'], 'status' => 'OPEN',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return ServiceResponse::success(DB::table('booking.reservation_incidents')->find($caseId), 'Caso registrado. El responsable debe comunicar el plazo de respuesta.', 201);
    }

    public function update(string $kind, int $id, int $caseId, User $user, array $data): ServiceResponse
    {
        $reservation = $this->context->resolve($kind, $id, $user);
        abort_unless($this->context->isManager($reservation, $user), 403);
        $query = DB::table('booking.reservation_incidents')->where('reservation_kind', $kind)->where('reservation_id', $id)->where('id', $caseId);
        abort_unless($query->exists(), 404);
        $query->update($data + ['resolved_at' => $data['status'] === 'RESOLVED' ? now() : null, 'updated_at' => now()]);
        return ServiceResponse::success($query->first(), 'Caso actualizado');
    }
}
