<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\Support\Money;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Platform\Services\MarketplaceOutbox;
use App\Modules\Finance\Models\CheckoutRefund;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CheckoutRefundService
{
    public function request(CheckoutOrder $order, int $amount, string $key, string $reason): CheckoutRefund
    {
        return DB::transaction(function () use ($order, $amount, $key, $reason) {
            $order = CheckoutOrder::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $existing = CheckoutRefund::where('checkout_order_id', $order->id)->where('idempotency_key', $key)->first();
            if ($existing) {
                if ($existing->amount_in_cents !== $amount || $existing->reason !== $reason) throw ValidationException::withMessages(['idempotency_key' => 'La referencia ya corresponde a otra devolución.']);
                return $existing;
            }
            $committed = (int) CheckoutRefund::where('checkout_order_id', $order->id)->whereIn('status', ['REQUESTED', 'PROCESSING', 'COMPLETED'])->sum('amount_in_cents');
            if (! $order->credited_at || $order->purpose !== 'reservation' || $amount <= 0 || $amount > $order->amount_in_cents - $committed) {
                throw ValidationException::withMessages(['amount' => 'La devolución supera el importe cobrado elegible restante.']);
            }
            $refund = CheckoutRefund::create(['id' => (string) Str::uuid(), 'checkout_order_id' => $order->id,
                'idempotency_key' => $key, 'amount_in_cents' => $amount, 'currency' => $order->currency,
                'reason' => $reason, 'status' => 'REQUESTED']);
            $this->emit($refund, $order);
            return $refund;
        });
    }

    /** Only called after the gateway has verified a VOIDED transaction server-side. */
    public function recordVerifiedVoid(CheckoutOrder $order): void
    {
        $pending = CheckoutRefund::where('checkout_order_id', $order->id)->whereIn('status', ['REQUESTED', 'PROCESSING'])->lockForUpdate()->get();
        foreach ($pending as $refund) {
            $refund->update(['status' => 'COMPLETED', 'provider_reference' => $order->provider_transaction_id, 'completed_at' => now()]);
            $this->emit($refund, $order);
        }
        $completed = (int) CheckoutRefund::where('checkout_order_id', $order->id)->where('status', 'COMPLETED')->sum('amount_in_cents');
        if ($completed < $order->amount_in_cents) {
            $refund = $this->request($order, $order->amount_in_cents - $completed, (string) Str::uuid(), 'Anulación confirmada por el proveedor');
            $refund->update(['status' => 'COMPLETED', 'provider_reference' => $order->provider_transaction_id, 'completed_at' => now()]);
            $this->emit($refund, $order);
        }
        DB::table('finance.payments')->where('external_reference', $order->reference)->update(['status' => 'REFUNDED', 'refunded_at' => now(), 'updated_at' => now()]);
        DB::table('booking.appointments')->where('id', $order->target_id)->update(['payment_status' => 'REFUNDED', 'updated_at' => now()]);
    }

    private function emit(CheckoutRefund $refund, CheckoutOrder $order): void
    {
        $appointment = Appointment::with('business')->findOrFail($order->target_id);
        app(MarketplaceOutbox::class)->record('refund:'.$refund->id.':'.$refund->status, 'refund.updated', $appointment->business_id, $appointment->business->owner_user_id,
            ['refund_id' => $refund->id, 'appointment_id' => $appointment->id, 'status' => $refund->status, 'amount' => Money::decimal($refund->amount_in_cents), 'currency' => $refund->currency]);
    }

    public function present(CheckoutRefund $refund): array
    {
        return ['id' => $refund->id, 'amount' => Money::decimal($refund->amount_in_cents), 'currency' => $refund->currency,
            'status' => $refund->status, 'reason' => $refund->reason, 'provider_reference' => $refund->provider_reference,
            'completed_at' => $refund->completed_at?->toIso8601String(), 'created_at' => $refund->created_at->toIso8601String(),
            'destination' => 'ORIGINAL_PAYMENT_METHOD', 'automatic_processing_enabled' => false];
    }
}
