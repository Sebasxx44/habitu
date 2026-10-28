<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Services;

use App\Models\User;
use App\Modules\Benefits\Models\ServiceGift;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Catalog\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ServiceGiftService
{
    public function issue(User $actor, array $data): ServiceGift
    {
        return DB::transaction(function () use ($actor, $data) {
            DB::table('business.businesses')->where('id', $data['business_id'])->lockForUpdate()->first();
            $service = Service::where('business_id', $data['business_id'])->where('is_active', true)->findOrFail($data['service_id']);
            $fingerprint = hash('sha256', json_encode([$data['service_id'], $data['expires_at'], $data['restrictions']], JSON_THROW_ON_ERROR));
            $existing = ServiceGift::where('business_id', $data['business_id'])->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) { abort_unless(($existing->snapshot['request_fingerprint'] ?? '') === $fingerprint, 409, 'La referencia ya pertenece a otro vale.'); return $existing; }
            $gift = ServiceGift::create(['id' => (string) Str::uuid(), 'code' => (string) Str::uuid(), 'business_id' => $data['business_id'],
                'service_id' => $service->id, 'issued_by' => $actor->id, 'idempotency_key' => $data['idempotency_key'],
                'expires_at' => \Carbon\CarbonImmutable::parse($data['expires_at'], config('booking.timezone'))->endOfDay(),
                'snapshot' => ['service_name' => $service->name, 'business_name' => $service->business->name, 'duration_minutes' => $service->duration_minutes,
                    'participants' => 1, 'restrictions' => $data['restrictions'], 'issuance' => 'BUSINESS_MANUAL', 'cash_collected' => false, 'request_fingerprint' => $fingerprint]]);
            $this->event($gift, $actor, 'ISSUED');
            return $gift;
        });
    }

    public function claim(User $user, string $code): ServiceGift
    {
        return DB::transaction(function () use ($user, $code) {
            $gift = ServiceGift::where('code', $code)->lockForUpdate()->firstOrFail();
            abort_unless($gift->status === 'AVAILABLE' && $gift->expires_at->isFuture(), 422, 'Este vale venció o ya fue entregado.');
            abort_unless($gift->recipient_user_id === null || (int) $gift->recipient_user_id === $user->id, 403, 'Este vale ya pertenece a otro destinatario.');
            if ($gift->recipient_user_id === null) {
                $gift->update(['recipient_user_id' => $user->id]);
                $this->event($gift, $user, 'CLAIMED');
            }
            return $gift;
        });
    }

    public function redeem(User $actor, ServiceGift $gift, int $appointmentId): ServiceGift
    {
        return DB::transaction(function () use ($actor, $gift, $appointmentId) {
            $gift = ServiceGift::whereKey($gift->id)->lockForUpdate()->firstOrFail();
            if ($gift->status === 'REDEEMED') { abort_unless((int) $gift->appointment_id === $appointmentId, 409, 'El vale ya fue canjeado en otra atención.'); return $gift; }
            abort_unless($gift->status === 'AVAILABLE' && $gift->expires_at->isFuture(), 422, 'El vale venció o no está disponible.');
            $appointment = Appointment::where('business_id', $gift->business_id)->where('service_id', $gift->service_id)->lockForUpdate()->findOrFail($appointmentId);
            abort_unless($gift->recipient_user_id && (int) $appointment->client?->user_id === (int) $gift->recipient_user_id, 422, 'El destinatario debe reclamar el vale y ser titular de la reserva.');
            abort_unless($appointment->getRawOriginal('status') === 'COMPLETED' && $appointment->participants === 1
                && $appointment->duration_minutes === ($gift->snapshot['duration_minutes'] ?? null), 422, 'Registra primero la atención completada correspondiente al servicio y duración del vale.');
            abort_unless($appointment->payment_status === 'PENDING' && ! DB::table('finance.payments')->where('appointment_id', $appointmentId)->whereIn('status', ['COMPLETED', 'PAID'])->exists(), 422, 'La atención ya tiene un pago o beneficio aplicado.');
            $gift->update(['status' => 'REDEEMED', 'appointment_id' => $appointmentId, 'redeemed_by' => $actor->id, 'redeemed_at' => now()]);
            $appointment->update(['payment_status' => 'COVERED_BY_GIFT']);
            DB::table('booking.appointment_events')->insert(['appointment_id' => $appointmentId, 'type' => 'gift_redeemed',
                'description' => 'Atención cubierta por vale de servicio '.$gift->id.'. No representa cobro en efectivo.', 'created_at' => now()]);
            $this->event($gift, $actor, 'REDEEMED', ['appointment_id' => $appointmentId]);
            return $gift;
        });
    }

    public function present(ServiceGift $gift): array
    {
        $snapshot = $gift->snapshot;
        unset($snapshot['request_fingerprint']);
        return ['id' => $gift->id, 'code' => $gift->code, 'business_id' => $gift->business_id, 'service_id' => $gift->service_id,
            'status' => $gift->status === 'AVAILABLE' && $gift->expires_at->isPast() ? 'EXPIRED' : $gift->status,
            'claimed' => $gift->recipient_user_id !== null, 'snapshot' => $snapshot, 'expires_at' => $gift->expires_at->toIso8601String(),
            'appointment_id' => $gift->appointment_id, 'redeemed_at' => $gift->redeemed_at?->toIso8601String(),
            'events' => DB::table('loyalty.service_gift_events')->where('gift_id', $gift->id)->orderBy('id')->get(['type', 'created_at'])];
    }

    private function event(ServiceGift $gift, User $actor, string $type, array $details = []): void
    {
        DB::table('loyalty.service_gift_events')->insert(['gift_id' => $gift->id, 'actor_id' => $actor->id, 'type' => $type,
            'details' => json_encode($details, JSON_THROW_ON_ERROR), 'created_at' => now()]);
    }
}
