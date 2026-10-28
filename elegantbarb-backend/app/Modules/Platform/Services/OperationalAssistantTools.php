<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/** Operational assistant reads the existing schedule and prepares links to normal, revalidated actions. */
final class OperationalAssistantTools
{
    public function execute(User $user, string $content, array $filters): array
    {
        abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_PROFESSIONAL, User::ROLE_SUPERADMIN], true)
            && $user->hasEffectivePermission('appointments.view'), 403);
        $english = ($filters['locale'] ?? 'es') === 'en';
        $text = BookingAssistantLanguage::normalize($content);
        $date = $filters['date'] ?? CarbonImmutable::now(config('booking.timezone'))->toDateString();
        if (preg_match('/\b(20\d{2}-\d{2}-\d{2})\b/', $content, $match)) $date = $match[1];
        elseif (preg_match('/manana|tomorrow/', $text)) $date = CarbonImmutable::now(config('booking.timezone'))->addDay()->toDateString();
        elseif (preg_match('/hoy|today/', $text)) $date = CarbonImmutable::now(config('booking.timezone'))->toDateString();
        if (! CarbonImmutable::hasFormat($date, 'Y-m-d')) throw ValidationException::withMessages(['date' => 'Fecha inválida.']);
        $query = $this->scope($user, $filters)->whereDate('date', $date);
        if (! empty($filters['branch_id'])) $query->where('branch_id', $filters['branch_id']);
        if (! empty($filters['service_id'])) $query->where('service_id', $filters['service_id']);
        $all = (clone $query)->get(['id', 'status', 'payment_status', 'checked_in_at', 'start_time', 'end_time', 'date']);
        $active = $all->filter(fn ($appointment) => in_array($appointment->getRawOriginal('status'), ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true));
        $clock = CarbonImmutable::now(config('booking.timezone'));
        $late = $active->filter(fn ($appointment) => ! $appointment->checked_in_at
            && CarbonImmutable::parse($date.' '.$appointment->start_time->format('H:i'), config('booking.timezone'))->lt($clock))->count();
        $summary = ['date' => $date, 'total' => $all->count(), 'active' => $active->count(), 'pending_confirmation' => $active->where('status', \App\Core\Enums\AppointmentStatus::PENDING)->count(),
            'pending_arrival' => $late, 'occupied_minutes' => $active->sum(fn ($appointment) => (int) $appointment->start_time->diffInMinutes($appointment->end_time))];
        $action = preg_match('/cancel|cancelar|anular/', $text) ? 'review_cancellation'
            : (preg_match('/reprogram|reagend|reschedul|retras|delay|late/', $text) ? 'review_reschedule' : 'review_booking');
        $prefix = $user->role === User::ROLE_PROFESSIONAL ? '/professional' : ($user->role === User::ROLE_SUPERADMIN ? '/superadmin' : '/admin');
        $cards = (clone $query)->with(['business:id,name', 'branch:id,name', 'service:id,name,duration_minutes', 'professional:id,name', 'resource:id,name'])
            ->orderBy('start_time')->limit(20)->get()->map(fn ($appointment) => [
                'type' => 'appointment', 'appointment_id' => $appointment->id, 'status' => $appointment->getRawOriginal('status'),
                'business_id' => $appointment->business_id, 'business_name' => $appointment->business?->name ?? '',
                'branch_id' => $appointment->branch_id, 'branch_name' => $appointment->branch?->name ?? '', 'address' => '',
                'service_id' => $appointment->service_id, 'service_name' => $appointment->service?->name ?? '',
                'price' => (float) $appointment->final_price, 'currency' => $appointment->currency,
                'duration_minutes' => $appointment->duration_minutes ?? $appointment->service?->duration_minutes ?? 0,
                'professional_id' => $appointment->professional_id, 'professional_name' => $appointment->professional?->name,
                'resource_id' => $appointment->resource_id, 'resource_name' => $appointment->resource?->name,
                'date' => $date, 'time' => $appointment->start_time->format('H:i'), 'slots' => [], 'promotion' => null,
                'prepared_action' => $action, 'checked_at' => now()->toIso8601String(), 'expires_at' => now()->addMinutes(5)->toIso8601String(),
                'url' => $prefix.'/appointments?'.http_build_query(['date' => $date, 'appointment_id' => $appointment->id]),
            ])->all();
        if ($action === 'review_reschedule' && $cards !== []) {
            $target = (clone $query)->whereIn('status', ['PENDING', 'CONFIRMED'])->orderBy('start_time')->first();
            if ($target && $target->branch_id && $target->service_id) {
                try {
                    $availability = app(AvailabilityService::class)->slots([
                        'business_id' => $target->business_id, 'branch_id' => $target->branch_id, 'service_id' => $target->service_id,
                        'professional_id' => $target->professional_id, 'resource_id' => $target->resource_id,
                        'duration_minutes' => $target->duration_minutes ?? $target->service?->duration_minutes,
                        'participants' => $target->participants ?? 1, 'date' => $date, 'appointment_id' => $target->id,
                        'client_user_id' => $target->client?->user_id,
                    ]);
                    $proposed = collect($availability['slots'] ?? [])->filter(fn ($slot) => ! empty($slot['available'])
                        && CarbonImmutable::parse($date.' '.$slot['start_time'], config('booking.timezone'))->gt($clock->addMinutes(15)))
                        ->take(3)->map(fn ($slot) => ['start_time' => $slot['start_time'], 'end_time' => $slot['end_time'], 'price' => $slot['price']])->values()->all();
                    foreach ($cards as &$card) if ($card['appointment_id'] === $target->id) $card['proposed_slots'] = $proposed;
                    unset($card);
                } catch (ValidationException) { /* The normal reschedule form revalidates alternatives and policy. */ }
            }
        }
        $explanation = $english
            ? "Schedule {$date}: {$summary['active']} active bookings, {$summary['pending_confirmation']} pending confirmation and {$late} arrivals pending after their start time."
            : "Agenda {$date}: {$summary['active']} reservas activas, {$summary['pending_confirmation']} por confirmar y {$late} llegadas pendientes después de su hora de inicio.";
        $explanation .= $english
            ? ' These arrival indicators need verification. Review each booking before confirming a change; I have not moved or cancelled anything.'
            : ' Estos indicadores de llegada requieren verificación. Revisa cada reserva antes de confirmar un cambio; no he movido ni cancelado ninguna.';
        return ['cards' => $cards, 'summary' => $summary, 'filters' => array_intersect_key(array_replace($filters, ['date' => $date]), array_flip(['date', 'locale', 'business_id', 'branch_id', 'service_id', 'professional_id'])),
            'explanation' => $explanation, 'intent' => $action];
    }

    private function scope(User $user, array $filters): Builder
    {
        $query = Appointment::query();
        $businesses = app(BusinessAccessService::class)->businessIds($user);
        if ($user->role !== User::ROLE_SUPERADMIN) {
            abort_if(! empty($filters['business_id']) && ! in_array((int) $filters['business_id'], $businesses, true), 403);
            $query->whereIn('business_id', $businesses);
        }
        if (! empty($filters['business_id'])) $query->where('business_id', $filters['business_id']);
        if ($user->role === User::ROLE_PROFESSIONAL) {
            $professionalId = Professional::where('user_id', $user->id)->value('id');
            abort_unless($professionalId, 403);
            abort_if(! empty($filters['professional_id']) && (int) $filters['professional_id'] !== (int) $professionalId, 403);
            $query->where('professional_id', $professionalId);
        } elseif (! empty($filters['professional_id'])) {
            $query->where('professional_id', $filters['professional_id']);
        }
        return $query;
    }
}
