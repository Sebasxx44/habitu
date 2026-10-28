<?php

namespace App\Jobs\Booking;

use App\Mail\BookingUpdate;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

final class SendBookingEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;
    public int $timeout = 45;

    public function __construct(public int $deliveryId) {}

    public function handle(): void
    {
        if (! config('booking.email_enabled')) return;
        $failure = DB::transaction(function () {
            $delivery = DB::table('booking.notification_deliveries')->where('id', $this->deliveryId)->lockForUpdate()->first();
            if (! $delivery || $delivery->status !== 'PENDING') return null;
            $payload = json_decode($delivery->payload, true, flags: JSON_THROW_ON_ERROR);
            if ($payload['event_type'] === 'waitlist_available' && ! \App\Modules\Booking\Models\Waitlist::whereKey($delivery->waitlist_id)->where('status', 'NOTIFIED')->where('expires_at', '>', now())->exists()) {
                DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update(['status' => 'SUPPRESSED', 'last_error' => 'ALERT_CANCELLED', 'updated_at' => now()]);
                return null;
            }
            if ($payload['event_type'] === 'reminder') {
                $appointment = Appointment::find($delivery->appointment_id);
                if (! $appointment || ! in_array($appointment->getRawOriginal('status'), ['PENDING', 'CONFIRMED', 'RESCHEDULED'], true)
                    || $appointment->date->format('d/m/Y') !== $payload['date']
                    || substr($appointment->getRawOriginal('start_time'), 0, 5) !== $payload['time']) {
                    DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update(['status' => 'SUPPRESSED', 'last_error' => 'REMINDER_STALE', 'updated_at' => now()]);
                    return null;
                }
            }
            $recipient = User::find($delivery->user_id);
            if (! \App\Modules\Accounts\Services\AccountPreferences::allows($recipient, 'email_notifications') || (($payload['event_type'] ?? '') === 'reminder' && ! \App\Modules\Accounts\Services\AccountPreferences::allows($recipient, 'appointment_reminders'))) {
                DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update(['status' => 'SUPPRESSED', 'last_error' => 'USER_PREFERENCE', 'updated_at' => now()]);
                return null;
            }
            $email = $recipient?->email;
            if (! $email || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update(['status' => 'SUPPRESSED', 'last_error' => 'NO_RECIPIENT', 'updated_at' => now()]);
                return null;
            }
            $attempts = $delivery->attempts + 1;
            try {
                Mail::to($email)->send(new BookingUpdate($payload));
                $preview = in_array(config('mail.default'), ['log', 'array'], true);
                DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update([
                    'status' => $preview ? 'PREVIEW' : 'SENT', 'attempts' => $attempts, 'sent_at' => $preview ? null : now(), 'last_error' => null, 'updated_at' => now(),
                ]);
                return null;
            } catch (\Throwable $exception) {
                DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update([
                    'status' => $attempts >= $this->tries ? 'FAILED' : 'PENDING', 'attempts' => $attempts,
                    'last_error' => 'MAIL_TRANSPORT_FAILED', 'updated_at' => now(),
                ]);
                return $exception;
            }
        });
        if ($failure) {
            Log::warning('Booking email delivery failed', ['delivery_id' => $this->deliveryId]);
            throw new \RuntimeException('Booking email delivery failed.');
        }
    }
}
