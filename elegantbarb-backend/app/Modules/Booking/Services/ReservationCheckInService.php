<?php

namespace App\Modules\Booking\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ReservationCheckInService
{
    public function __construct(private ReservationContextService $context) {}

    public function issue(string $kind, int $id, User $user): ServiceResponse
    {
        return DB::transaction(function () use ($kind, $id, $user) {
            $reservation = $this->context->resolve($kind, $id, $user, true);
            abort_unless((int) $reservation->client?->user_id === $user->id, 403);
            $this->assertWindow($reservation);
            $existing = $this->token($kind, $id)->first();
            abort_if($existing?->consumed_at, 409, 'La llegada ya está registrada.');
            abort_if($existing && Carbon::parse($existing->expires_at)->isFuture(), 409, 'Ya existe un PIN vigente; espera su vencimiento para renovarlo.');
            $pin = (string) random_int(100000, 999999);
            $expires = now()->addMinutes(15);
            $this->token($kind, $id)->updateOrInsert(['reservation_kind' => $kind, 'reservation_id' => $id], [
                'pin_hash' => Hash::make($pin), 'attempts' => 0, 'expires_at' => $expires,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            return ServiceResponse::success(['pin' => $pin, 'expires_at' => $expires->toIso8601String()], 'PIN válido por 15 minutos');
        });
    }

    public function verify(string $kind, int $id, User $user, ?string $pin, ?string $reason): ServiceResponse
    {
        return DB::transaction(function () use ($kind, $id, $user, $pin, $reason) {
            $reservation = $this->context->resolve($kind, $id, $user, true);
            $manager = $this->context->isManager($reservation, $user);
            abort_unless($manager || ($user->role === User::ROLE_PROFESSIONAL && (int) $reservation->professional?->user_id === $user->id), 403);
            $this->assertWindow($reservation);
            $query = $this->token($kind, $id);
            $token = $query->lockForUpdate()->first();
            abort_if($token?->consumed_at, 409, 'Este PIN ya fue utilizado.');
            if ($reason !== null) {
                abort_unless($manager, 403, 'El registro manual requiere administración autorizada.');
                $query->updateOrInsert(['reservation_kind' => $kind, 'reservation_id' => $id], [
                    'pin_hash' => Hash::make((string) random_int(100000, 999999)), 'expires_at' => now(),
                    'consumed_at' => now(), 'consumed_by' => $user->id, 'manual_reason' => $reason,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            } else {
                abort_unless($token && Carbon::parse($token->expires_at)->isFuture() && $token->attempts < 5, 422, 'PIN vencido o bloqueado.');
                if (! $pin || ! Hash::check($pin, $token->pin_hash)) {
                    $query->increment('attempts');
                    return ServiceResponse::error('PIN incorrecto. Máximo cinco intentos.', null, 422);
                }
                $query->update(['consumed_at' => now(), 'consumed_by' => $user->id, 'updated_at' => now()]);
            }
            $reservation->update([$reservation instanceof Appointment ? 'checked_in_at' : 'arrived_at' => now()]);
            return ServiceResponse::success(['checked_in_at' => now()->toIso8601String()], 'Llegada registrada; no implica pago ni aceptación de extras');
        });
    }

    private function token(string $kind, int $id): \Illuminate\Database\Query\Builder
    {
        return DB::table('booking.check_in_tokens')->where('reservation_kind', $kind)->where('reservation_id', $id);
    }

    private function assertWindow(Model $reservation): void
    {
        if ($reservation instanceof Appointment) {
            abort_unless($this->context->status($reservation) === 'CONFIRMED', 422, 'La reserva debe estar confirmada.');
            $start = Carbon::parse($reservation->date->toDateString().' '.$reservation->start_time->format('H:i:s'), $reservation->business?->timezone ?? 'America/Bogota');
            $end = Carbon::parse($reservation->date->toDateString().' '.$reservation->end_time->format('H:i:s'), $reservation->business?->timezone ?? 'America/Bogota');
            abort_unless(now()->between($start->subHour(), $end->addHour()), 422, 'El registro de llegada está fuera del horario permitido.');
            abort_if($reservation->checked_in_at, 409, 'La llegada ya está registrada.');
        } else {
            abort_unless(in_array($this->context->status($reservation), ['ACCEPTED', 'ON_THE_WAY'], true), 422, 'El domicilio no permite registrar llegada en su estado actual.');
            abort_if($reservation->arrived_at, 409, 'La llegada ya está registrada.');
        }
    }
}
