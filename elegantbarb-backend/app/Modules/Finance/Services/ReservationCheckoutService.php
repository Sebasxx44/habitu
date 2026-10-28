<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\Enums\AppointmentStatus;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentPresentationService;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Finance\Models\CheckoutOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class ReservationCheckoutService
{
    public function policy(int $businessId): array
    {
        $policy = BookingPaymentPolicy::find($businessId);
        return ['configured' => $policy !== null, 'allowed_modes' => $policy?->allowed_modes ?? [],
            'deposit_percentage' => $policy?->deposit_percentage, 'hold_minutes' => $policy?->hold_minutes ?? 15,
            'cancellation_terms' => $policy?->cancellation_terms, 'version' => $policy?->version,
            'online_payments_enabled' => app(WompiGateway::class)->enabled(), 'saved_payment_methods_enabled' => false];
    }

    public function create(User $user, array $data): array
    {
        return DB::transaction(function () use ($user, $data) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $fingerprintData = $data;
            unset($fingerprintData['idempotency_key']);
            ksort($fingerprintData);
            $fingerprint = hash('sha256', json_encode($fingerprintData, JSON_THROW_ON_ERROR));
            $existing = Appointment::where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                abort_unless((int) $existing->client?->user_id === $user->id, 403);
                if (($existing->checkout_snapshot['request_fingerprint'] ?? '') !== $fingerprint) throw ValidationException::withMessages(['idempotency_key' => 'Esta confirmación ya corresponde a otra reserva.']);
                $this->expireAppointment($existing);
                return $this->present($existing->fresh(), $user);
            }
            if (CheckoutOrder::where('user_id', $user->id)->where('idempotency_key', $data['idempotency_key'])->exists()) throw ValidationException::withMessages(['idempotency_key' => 'La referencia ya corresponde a otro pago.']);
            $policy = BookingPaymentPolicy::whereKey($data['business_id'])->lockForUpdate()->first();
            if (! $policy || ! in_array($data['payment_mode'], $policy->allowed_modes, true)) throw ValidationException::withMessages(['payment_mode' => 'El negocio debe habilitar explícitamente esta modalidad de pago.']);
            if ($policy->version !== (int) $data['expected_policy_version']) throw ValidationException::withMessages(['expected_policy_version' => 'Las condiciones cambiaron. Revísalas y confirma nuevamente.']);
            $online = $data['payment_mode'] !== 'ON_SITE';
            if ($online && ! app(WompiGateway::class)->enabled()) abort(503, 'El pago directo no está disponible. No se ha creado un cobro.');
            $data['client_user_id'] = $user->id;
            $data['_checkout_authorized'] = true;
            $data['_checkout_hold_until'] = $online ? now()->addMinutes($policy->hold_minutes) : null;
            $appointment = app(AppointmentService::class)->create($data)->data;
            if ($online && $appointment->currency !== 'COP') throw ValidationException::withMessages(['payment_mode' => 'Wompi admite únicamente pagos en pesos colombianos (COP).']);
            $total = Money::minor($appointment->final_price);
            $payNow = match ($data['payment_mode']) {
                'ON_SITE' => 0,
                'DEPOSIT' => intdiv($total * $policy->deposit_percentage + 99, 100),
                default => $total,
            };
            if ($online && ($payNow < 100 || $payNow > 500000000)) throw ValidationException::withMessages(['payment_mode' => 'Este importe no admite pago en línea.']);
            $service = $appointment->service;
            $snapshot = ['payment_mode' => $data['payment_mode'], 'policy_version' => $policy->version,
                'subtotal' => $appointment->price, 'discount' => $appointment->discount_amount, 'total' => $appointment->final_price,
                'pay_now' => Money::decimal($payNow), 'pay_later' => Money::decimal($total - $payNow), 'currency' => $appointment->currency,
                'cancellation_terms' => $policy->cancellation_terms, 'allow_cancellation' => (bool) $service->allow_cancellation,
                'cancellation_notice_minutes' => (int) $service->cancellation_notice_minutes,
                'allow_reschedule' => (bool) $service->allow_reschedule, 'reschedule_notice_minutes' => (int) $service->reschedule_notice_minutes,
                'requires_confirmation' => (bool) $service->requires_confirmation,
                'service_name' => $service->name, 'branch_name' => $appointment->branch?->name,
                'professional_name' => $appointment->professional?->name, 'resource_name' => $appointment->resource?->name,
                'duration_minutes' => $appointment->duration_minutes, 'participants' => $appointment->participants,
                'accepted_at' => now()->toIso8601String(), 'request_fingerprint' => $fingerprint];
            $appointment->update(['checkout_snapshot' => $snapshot]);
            if ($online) {
                $id = (string) Str::uuid();
                CheckoutOrder::create(['id' => $id, 'user_id' => $user->id, 'purpose' => 'reservation', 'target_id' => $appointment->id,
                    'idempotency_key' => $data['idempotency_key'], 'reference' => 'HABITU-'.$id, 'amount_in_cents' => $payNow,
                    'currency' => $appointment->currency, 'environment' => app(WompiGateway::class)->environment(),
                    'metadata' => ['snapshot' => $snapshot, 'resolution' => 'AWAITING_PAYMENT'],
                    'expires_at' => $appointment->hold_expires_at, 'status' => 'PENDING']);
            }
            return $this->present($appointment, $user);
        }, 3);
    }

    public function fulfill(CheckoutOrder $order, array $payment): void
    {
        $appointment = Appointment::whereKey($order->target_id)->lockForUpdate()->firstOrFail();
        $active = in_array($appointment->status, [AppointmentStatus::PENDING, AppointmentStatus::CONFIRMED, AppointmentStatus::RESCHEDULED], true);
        $expired = $appointment->hold_expires_at?->isPast() ?? true;
        $available = $active && ! $expired;
        if ($available) {
            try {
                app(AvailabilityService::class)->reserve($appointment->getAttributes(), $appointment->id);
            } catch (ValidationException $exception) {
                $available = false;
            }
        }
        DB::table('finance.payments')->insert(['appointment_id' => $appointment->id, 'client_id' => $appointment->client_id,
            'business_id' => $appointment->business_id, 'amount' => Money::decimal($order->amount_in_cents), 'currency' => $order->currency,
            'method' => 'WOMPI', 'external_reference' => $order->reference, 'external_transaction_id' => $payment['id'],
            'status' => 'COMPLETED', 'paid_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $order->credited_at = now();
        $order->provider_transaction_id = $payment['id'];
        $order->save();
        if (! $available) {
            if ($active) app(AppointmentService::class)->cancel($appointment->id, 'El pago llegó cuando la reserva ya no podía confirmarse.');
            $reason = ! $active ? 'Reserva cancelada antes de confirmar el pago' : ($expired ? 'Pago aprobado después del vencimiento del bloqueo' : 'La disponibilidad cambió antes de confirmar el pago');
            $refund = app(CheckoutRefundService::class)->request($order, $order->amount_in_cents, $order->idempotency_key, $reason);
            $appointment->update(['payment_status' => 'REFUND_PENDING']);
            $order->metadata = array_merge($order->metadata ?? [], ['resolution' => 'REFUND_REQUESTED', 'resolution_reason' => $reason, 'refund_id' => $refund->id, 'resolved_at' => now()->toIso8601String()]);
            $order->save();
            return;
        }
        $appointment->update(['hold_expires_at' => null,
            'payment_status' => $order->amount_in_cents >= Money::minor($appointment->final_price) ? 'PAID' : 'PARTIALLY_PAID']);
        if ($appointment->status === AppointmentStatus::PENDING && ! ($appointment->checkout_snapshot['requires_confirmation'] ?? true)) app(AppointmentService::class)->update($appointment->id, ['status' => 'CONFIRMED']);
        $order->metadata = array_merge($order->metadata ?? [], ['resolution' => 'APPLIED', 'resolved_at' => now()->toIso8601String()]);
        $order->save();
        $eventId = DB::table('booking.appointment_events')->insertGetId(['appointment_id' => $appointment->id, 'type' => 'payment_confirmed', 'description' => 'Pago verificado por Wompi: '.$order->reference, 'created_at' => now()]);
        app(\App\Modules\Platform\Services\MarketplaceOutbox::class)->booking($eventId);
    }

    public function expireAppointment(Appointment $appointment): void
    {
        if (! $appointment->hold_expires_at?->isPast() || ! in_array($appointment->status, [AppointmentStatus::PENDING, AppointmentStatus::CONFIRMED], true)) return;
        app(AppointmentService::class)->cancel($appointment->id, 'El bloqueo de pago venció; no se confirmó el cobro.');
        DB::table('booking.appointment_events')->insert(['appointment_id' => $appointment->id, 'type' => 'payment_hold_expired', 'description' => 'Inventario liberado por vencimiento del bloqueo.', 'created_at' => now()]);
    }

    public function expire(): int
    {
        $count = 0;
        Appointment::whereNotNull('hold_expires_at')->where('hold_expires_at', '<=', now())->whereIn('status', ['PENDING', 'CONFIRMED'])->orderBy('id')->chunkById(50, function ($appointments) use (&$count) {
            foreach ($appointments as $appointment) DB::transaction(function () use ($appointment, &$count) {
                $locked = Appointment::whereKey($appointment->id)->lockForUpdate()->firstOrFail();
                $this->expireAppointment($locked);
                $count++;
            });
        });
        return $count;
    }

    private function present(Appointment $appointment, User $user): array
    {
        $order = CheckoutOrder::where('purpose', 'reservation')->where('target_id', $appointment->id)->first();
        $snapshot = $appointment->checkout_snapshot;
        unset($snapshot['request_fingerprint']);
        return ['appointment' => app(AppointmentPresentationService::class)->present($appointment, $user, true),
            'payment_order' => $order ? app(WompiCheckoutService::class)->present($order) : null, 'snapshot' => $snapshot];
    }
}
