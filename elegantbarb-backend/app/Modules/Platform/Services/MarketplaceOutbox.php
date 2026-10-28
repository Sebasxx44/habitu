<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Services\WebhookService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class MarketplaceOutbox
{
    public function booking(int $eventId): void
    {
        $event = DB::table('booking.appointment_events')->where('id', $eventId)->first();
        if (! $event) return;
        $appointment = Appointment::with('business')->find($event->appointment_id);
        if (! $appointment) return;
        $type = match ($event->type) {
            'created' => $appointment->getRawOriginal('status') === 'CONFIRMED' ? 'booking.confirmed' : 'booking.created',
            'confirmed' => 'booking.confirmed', 'cancelled' => 'booking.cancelled', 'completed' => 'service.completed',
            'rescheduled' => 'booking.rescheduled', 'payment_confirmed' => 'payment.approved', default => null,
        };
        if (! $type) return;
        $this->record('booking-event:'.$eventId, $type, $appointment->business_id, $appointment->business->owner_user_id,
            ['appointment_id' => $appointment->id, 'service_id' => $appointment->service_id, 'branch_id' => $appointment->branch_id,
                'status' => $appointment->getRawOriginal('status'), 'payment_status' => $appointment->payment_status,
                'date' => $appointment->date->toDateString(), 'time' => $appointment->start_time->format('H:i'),
                'timezone' => config('booking.timezone'), 'currency' => $appointment->currency]);
        if ($event->type === 'cancelled') $this->record('availability:'.$eventId, 'availability.released', $appointment->business_id, $appointment->business->owner_user_id,
            ['appointment_id' => $appointment->id, 'service_id' => $appointment->service_id, 'branch_id' => $appointment->branch_id]);
    }

    public function record(string $source, string $event, ?int $businessId, ?int $ownerId, array $data): void
    {
        DB::transaction(function () use ($source, $event, $businessId, $ownerId, $data) {
            $id = (string) Str::uuid();
            $payload = ['id' => $id, 'type' => $event, 'version' => 1, 'occurred_at' => now()->toIso8601String(), 'business_id' => $businessId, 'data' => $data];
            $body = json_encode($payload, JSON_THROW_ON_ERROR);
            if (! DB::table('platform.marketplace_outbox')->insertOrIgnore(['id' => $id, 'source_key' => $source, 'event' => $event, 'business_id' => $businessId, 'payload' => $body, 'created_at' => now()])) return;
            if (! $ownerId) return;
            foreach (DB::table('platform.outgoing_webhooks')->where('user_id', $ownerId)->where('active', true)->get() as $webhook) {
                $events = json_decode($webhook->events, true, 512, JSON_THROW_ON_ERROR);
                if (! is_array($events)) continue;
                if (! in_array($event, $events, true) && ! in_array('*', $events, true)) continue;
                DB::table('platform.webhook_deliveries')->insertOrIgnore(['webhook_id' => $webhook->id, 'outbox_id' => $id, 'event' => $event,
                    'payload' => $body, 'state' => 'PENDING', 'attempt' => 0, 'available_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            }
        });
    }

    public function process(int $limit = 50): int
    {
        $count = 0;
        while ($count < $limit) {
            $delivery = DB::transaction(function () {
                $row = DB::table('platform.webhook_deliveries')->whereNotNull('outbox_id')->where('attempt', '<', 5)
                    ->where(fn ($query) => $query->where(fn ($q) => $q->where('state', 'PENDING')->where('available_at', '<=', now()))
                        ->orWhere(fn ($q) => $q->where('state', 'PROCESSING')->where('locked_at', '<', now()->subMinutes(5))))
                    ->orderBy('id')->lock('FOR UPDATE SKIP LOCKED')->first();
                if (! $row) return null;
                DB::table('platform.webhook_deliveries')->where('id', $row->id)->update(['state' => 'PROCESSING', 'locked_at' => now(), 'attempt' => $row->attempt + 1, 'updated_at' => now()]);
                $row->attempt++;
                return $row;
            });
            if (! $delivery) break;
            $webhook = DB::table('platform.outgoing_webhooks')->where('id', $delivery->webhook_id)->where('active', true)->first();
            $success = $webhook && app(WebhookService::class)->deliverQueued($webhook, $delivery);
            $state = $success ? 'DELIVERED' : (! $webhook ? 'SUPPRESSED' : ($delivery->attempt >= 5 ? 'FAILED' : 'PENDING'));
            DB::table('platform.webhook_deliveries')->where('id', $delivery->id)->update([
                'state' => $state, 'locked_at' => null, 'available_at' => now()->addSeconds([30, 120, 600, 3600, 3600][$delivery->attempt - 1]), 'updated_at' => now(),
            ]);
            $count++;
        }
        // A worker may die on its final attempt; never leave an eternal processing state.
        DB::table('platform.webhook_deliveries')->where('state', 'PROCESSING')->where('attempt', '>=', 5)->where('locked_at', '<', now()->subMinutes(5))->update(['state' => 'FAILED', 'locked_at' => null, 'updated_at' => now()]);
        return $count;
    }

    public function replay(User $user, int $id): void
    {
        DB::transaction(function () use ($user, $id) {
            $row = DB::table('platform.webhook_deliveries')->where('id', $id)->whereNotNull('outbox_id')->lockForUpdate()->first();
            abort_unless($row && DB::table('platform.outgoing_webhooks')->where('id', $row->webhook_id)->where('user_id', $user->id)->exists(), 404);
            abort_unless($row->state === 'FAILED', 409, 'Solo se pueden reintentar entregas fallidas.');
            DB::table('platform.webhook_deliveries')->where('id', $id)->update(['state' => 'PENDING', 'attempt' => 0, 'available_at' => now(), 'locked_at' => null, 'updated_at' => now()]);
        });
    }
}
