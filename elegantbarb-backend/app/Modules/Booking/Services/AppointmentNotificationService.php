<?php

namespace App\Modules\Booking\Services;

use App\Jobs\Booking\SendBookingEmail;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Platform\Models\Notification;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class AppointmentNotificationService
{
    /** Called in the booking transaction: database writes only, no external deliveries. */
    public function record(int $eventId): void
    {
        DB::transaction(function () use ($eventId) {
            $event = DB::table('booking.appointment_events')->where('id', $eventId)->lockForUpdate()->first();
            if (! $event) return;
            $appointment = Appointment::with(['client', 'professional', 'business', 'branch', 'service'])->find($event->appointment_id);
            if ($appointment) $this->notify($appointment, $event->type, 'event:'.$eventId);
        });
    }

    public function sendDueReminders(): int
    {
        $clock = CarbonImmutable::now(config('booking.timezone'));
        $windows = array_values(array_unique(array_filter(array_map('intval', config('booking.reminder_minutes', [1440, 60])), fn ($minutes) => $minutes > 0 && $minutes <= 10080)));
        if ($windows === []) return 0;
        $count = 0;
        Appointment::whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])
            ->whereBetween('date', [$clock->toDateString(), $clock->addMinutes(max($windows))->toDateString()])
            ->orderBy('id')->chunkById(100, function ($appointments) use ($clock, $windows, &$count) {
                foreach ($appointments as $candidate) $count += DB::transaction(function () use ($candidate, $clock, $windows) {
                    $appointment = Appointment::with(['client', 'professional', 'business', 'branch', 'service'])->lockForUpdate()->find($candidate->id);
                    if (! $appointment || ! in_array($appointment->getRawOriginal('status'), ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true)) return 0;
                    $start = $appointment->getRawOriginal('date').' '.$appointment->getRawOriginal('start_time');
                    $remaining = $clock->diffInMinutes(CarbonImmutable::parse($start, config('booking.timezone')), false);
                    if ($remaining <= 0) return 0;
                    $sent = 0;
                    foreach ($windows as $minutes) {
                        // A 10-minute window tolerates the five-minute scheduler cadence without sending a stale 24h reminder.
                        if ($remaining > $minutes || $remaining <= max(0, $minutes - 10)) continue;
                        $key = 'reminder:'.$appointment->id.':'.$start.':'.$minutes;
                        if (DB::table('booking.notification_deliveries')->where('event_key', $key)->exists()) continue;
                        if ($this->notify($appointment, 'reminder', $key) > 0) {
                            DB::table('booking.appointment_events')->insert([
                                'appointment_id' => $appointment->id, 'type' => 'reminder',
                                'description' => 'Recordatorio registrado en la aplicación. Correo sujeto al estado de entrega.', 'created_at' => now(),
                            ]);
                            $sent++;
                        }
                    }
                    return $sent;
                });
            });
        return $count;
    }

    /** The scheduler dispatches the durable outbox; HTTP booking requests never wait for email. */
    public function dispatchPendingEmails(): int
    {
        if (! config('booking.email_enabled')) return 0;
        $ids = DB::table('booking.notification_deliveries')->where('status', 'PENDING')->where('attempts', '<', 3)
            ->where(fn ($query) => $query->whereNull('queued_at')->orWhere('queued_at', '<', now()->subMinutes(10)))
            ->orderBy('id')->limit(100)->pluck('id');
        foreach ($ids as $id) DB::transaction(function () use ($id) {
            $delivery = DB::table('booking.notification_deliveries')->where('id', $id)->lockForUpdate()->first();
            if (! $delivery || $delivery->status !== 'PENDING' || ($delivery->queued_at && CarbonImmutable::parse($delivery->queued_at)->isAfter(now()->subMinutes(10)))) return;
            DB::table('booking.notification_deliveries')->where('id', $id)->update(['queued_at' => now(), 'updated_at' => now()]);
            SendBookingEmail::dispatch((int) $id)->onConnection('database')->onQueue('booking')->afterCommit();
        });
        return $ids->count();
    }

    private function notify(Appointment $appointment, string $type, string $key): int
    {
        $title = match ($type) {
            'created' => 'Reserva creada', 'confirmed' => 'Reserva confirmada', 'cancelled' => 'Reserva cancelada',
            'rescheduled' => 'Reserva reprogramada', 'completed' => 'Servicio completado', 'no_show' => 'Asistencia actualizada',
            'reminder' => 'Tu reserva se aproxima', default => 'Reserva actualizada',
        };
        $date = $appointment->date->format('d/m/Y');
        $time = substr($appointment->getRawOriginal('start_time'), 0, 5);
        $message = ($appointment->service?->name ?? 'Servicio').' · '.$date.' a las '.$time.' · '.($appointment->business?->name ?? 'Negocio');
        $userIds = array_unique(array_filter([$appointment->client?->user_id, $appointment->professional?->user_id, $appointment->business?->owner_user_id]));
        $count = 0;
        foreach (User::whereIn('id', $userIds)->get(['id', 'role', 'preferences']) as $user) {
            if ($type === 'reminder' && ! \App\Modules\Accounts\Services\AccountPreferences::allows($user, 'appointment_reminders')) continue;
            if (DB::table('booking.notification_deliveries')->where('event_key', $key)->where('user_id', $user->id)->exists()) continue;
            $url = match ($user->role) {
                User::ROLE_CLIENT => '/cliente/appointments/'.$appointment->id,
                User::ROLE_PROFESSIONAL => '/professional/appointments', default => '/admin/appointments',
            };
            $payload = [
                'title' => $title, 'message' => $message, 'url' => $url, 'event_type' => $type,
                'appointment_id' => $appointment->id, 'booking_code' => $appointment->booking_code,
                'date' => $date, 'time' => $time, 'timezone' => config('booking.timezone'),
                'service' => $appointment->service?->name, 'business' => $appointment->business?->name,
                'branch' => $appointment->branch?->name, 'professional' => $appointment->professional?->name,
            ];
            $notification = Notification::create(['user_id' => $user->id, 'type' => 'APPOINTMENT_'.strtoupper($type),
                'title' => $title, 'message' => $message, 'data' => $payload, 'read' => false]);
            DB::table('booking.notification_deliveries')->insert([
                'appointment_id' => $appointment->id, 'user_id' => $user->id, 'event_key' => $key,
                'notification_id' => $notification->id, 'payload' => json_encode($payload, JSON_THROW_ON_ERROR),
                'status' => config('booking.email_enabled') && \App\Modules\Accounts\Services\AccountPreferences::allows($user, 'email_notifications') ? 'PENDING' : 'DISABLED', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $count++;
        }
        return $count;
    }
}
