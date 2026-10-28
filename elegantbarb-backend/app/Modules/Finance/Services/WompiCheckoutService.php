<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Subscriptions\Services\MembershipService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class WompiCheckoutService
{
    public function __construct(private WompiGateway $gateway) {}

    public function create(int $userId, string $purpose, string $key, ?string $amount = null, ?int $planId = null): CheckoutOrder
    {
        if (! $this->gateway->enabled()) abort(503, 'Los pagos con Wompi aún no están disponibles.');
        return DB::transaction(function () use ($userId, $purpose, $key, $amount, $planId) {
            User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $existing = CheckoutOrder::where('user_id', $userId)->where('idempotency_key', $key)->first();
            if ($existing) {
                if ($existing->purpose !== $purpose || $existing->target_id !== $planId || ($purpose === 'wallet' && $existing->amount_in_cents !== Money::minor($amount ?? '0'))) {
                    throw ValidationException::withMessages(['idempotency_key' => 'La solicitud ya corresponde a otro pago.']);
                }
                return $existing;
            }
            $metadata = [];
            $currency = 'COP';
            if ($purpose === 'membership') {
                $quote = app(MembershipService::class)->prepareCheckout($userId, $planId);
                $amount = (string) $quote['amount'];
                $currency = $quote['currency'];
                $metadata = $quote['metadata'];
            } else {
                $wallet = app(WalletRepository::class)->getOrCreate($userId);
                if (! $wallet->is_active || $wallet->currency !== 'COP') throw ValidationException::withMessages(['wallet' => 'La billetera no admite recargas en COP.']);
            }
            $minor = Money::minor($amount ?? '0');
            if ($currency !== 'COP' || $minor < 100 || $minor > 500000000) throw ValidationException::withMessages(['amount' => 'El monto del pago no es válido.']);
            $id = (string) Str::uuid();
            return CheckoutOrder::create(['id' => $id, 'user_id' => $userId, 'purpose' => $purpose, 'target_id' => $planId,
                'idempotency_key' => $key, 'reference' => 'HABITU-'.$id, 'amount_in_cents' => $minor, 'currency' => $currency,
                'environment' => $this->gateway->environment(), 'metadata' => $metadata, 'expires_at' => now()->addHour(), 'status' => 'PENDING']);
        });
    }

    public function present(CheckoutOrder $order): array
    {
        $status = $order->status === 'PENDING' && $order->expires_at->isPast() ? 'EXPIRED' : $order->status;
        $canCheckout = $status === 'PENDING' && $order->provider_transaction_id === null && $this->gateway->enabled() && $order->environment === $this->gateway->environment();
        return ['id' => $order->id, 'reference' => $order->reference, 'purpose' => $order->purpose, 'target_id' => $order->target_id,
            'amount' => Money::decimal($order->amount_in_cents), 'currency' => $order->currency, 'status' => $status,
            'environment' => $order->environment, 'expires_at' => $order->expires_at->toIso8601String(), 'created_at' => $order->created_at->toIso8601String(),
            'payment_method' => $order->payment_method,
            'resolution' => $order->purpose === 'reservation' ? ($order->metadata['resolution'] ?? null) : null,
            'snapshot' => $order->purpose === 'reservation' ? array_diff_key($order->metadata['snapshot'] ?? [], ['request_fingerprint' => true]) : null,
            'refunds' => \App\Modules\Finance\Models\CheckoutRefund::where('checkout_order_id', $order->id)->orderBy('created_at')->get()
                ->map(fn ($refund) => app(CheckoutRefundService::class)->present($refund))->all(),
            'checkout_options' => $canCheckout ? $this->gateway->checkoutOptions($order) : null,
            'checkout_url' => $canCheckout ? $this->gateway->checkoutUrl($order) : null];
    }

    public function webhook(array $event): void
    {
        $transactionId = $this->gateway->verifyEvent($event);
        // Reference/currency are not necessarily among signed fields: obtain authoritative data server-side.
        $payment = $this->gateway->transaction($transactionId);
        $this->applyPayment($payment);
    }

    public function reconcile(int $userId, string $orderId, string $transactionId): CheckoutOrder
    {
        if (! $this->gateway->enabled()) abort(503, 'Wompi no está configurado.');
        $order = CheckoutOrder::where('user_id', $userId)->findOrFail($orderId);
        $payment = $this->gateway->transaction($transactionId);
        if (($payment['reference'] ?? '') !== $order->reference) throw ValidationException::withMessages(['transaction_id' => 'La transacción no corresponde a esta orden.']);
        $this->applyPayment($payment);
        return $order->fresh();
    }

    public function reconcilePending(): int
    {
        if (! $this->gateway->enabled()) return 0;
        $count = 0;
        CheckoutOrder::whereIn('status', ['PENDING', 'REVIEW'])->whereNotNull('provider_transaction_id')
            ->where('environment', $this->gateway->environment())->orderBy('updated_at')->limit(100)->get()->each(function ($order) use (&$count) {
                try {
                    $this->reconcile($order->user_id, $order->id, $order->provider_transaction_id);
                    $count++;
                } catch (\Throwable $exception) {
                    // Preserve the uncertain order; no new charge or alternate gateway is attempted.
                    \Log::warning('Checkout reconciliation pending', ['checkout_order_id' => $order->id]);
                }
            });
        return $count;
    }

    private function applyPayment(array $payment): void
    {
        DB::transaction(function () use ($payment) {
            $order = CheckoutOrder::where('reference', $payment['reference'] ?? '')->lockForUpdate()->first();
            if (! $order) return;
            if ($order->environment !== $this->gateway->environment() || ($payment['currency'] ?? '') !== $order->currency
                || $payment['amount_in_cents'] !== $order->amount_in_cents) {
                throw ValidationException::withMessages(['transaction' => 'La transacción no coincide con el pago pendiente.']);
            }
            $status = $payment['status'] ?? '';
            if (! in_array($status, ['APPROVED', 'PENDING', 'DECLINED', 'VOIDED', 'ERROR'], true)) abort(422, 'Estado no válido.');
            if ($order->credited_at) {
                if ($status === 'VOIDED' && $order->provider_transaction_id === $payment['id']) $this->freezeVoidedCredit($order);
                elseif ($status === 'APPROVED' && $order->provider_transaction_id !== $payment['id']) {
                    $metadata = $order->metadata ?? [];
                    $metadata['additional_approvals'][$payment['id']] ??= ['amount_in_cents' => $payment['amount_in_cents'], 'currency' => $payment['currency'], 'recorded_at' => now()->toIso8601String()];
                    $metadata['reconciliation_issue'] = 'ADDITIONAL_APPROVAL';
                    $order->update(['status' => 'REVIEW', 'metadata' => $metadata]);
                }
                return;
            }
            if ($status === 'PENDING' && $order->status !== 'PENDING') return;
            if ($status === 'APPROVED') {
                if ($order->purpose === 'wallet') {
                    $wallet = app(WalletRepository::class)->getOrCreate($order->user_id);
                    if ($wallet->currency !== $order->currency) throw ValidationException::withMessages(['currency' => 'La moneda de la billetera cambió.']);
                    $wallet->credit(Money::decimal($order->amount_in_cents), ['description' => 'Recarga confirmada por Wompi',
                        'external_reference' => 'WOMPI:'.$payment['id'], 'source_type' => 'WOMPI_TOPUP', 'payment_method' => 'WOMPI',
                        'metadata' => ['checkout_order_id' => $order->id]]);
                } elseif ($order->purpose === 'membership') {
                    app(MembershipService::class)->fulfillVerifiedPayment($order->user_id, $order->target_id, $order->id, Money::decimal($order->amount_in_cents), $order->metadata ?? []);
                } elseif ($order->purpose === 'reservation') {
                    app(ReservationCheckoutService::class)->fulfill($order, $payment);
                } else abort(422, 'Destino de pago no válido.');
                $order->credited_at = now();
            }
            $order->fill(['status' => $status, 'provider_transaction_id' => in_array($status, ['APPROVED', 'PENDING'], true) ? $payment['id'] : null, 'payment_method' => substr($payment['payment_method_type'] ?? '', 0, 40)])->save();
        });
    }

    private function freezeVoidedCredit(CheckoutOrder $order): void
    {
        $metadata = $order->metadata ?? [];
        if (isset($metadata['void_review'])) return;
        $review = ['provider_transaction_id' => $order->provider_transaction_id, 'amount' => Money::decimal($order->amount_in_cents), 'recorded_at' => now()->toIso8601String()];
        if ($order->purpose === 'wallet') {
            $wallet = Wallet::where('user_id', $order->user_id)->lockForUpdate()->firstOrFail();
            $held = Money::minor($wallet->hold_balance);
            $available = max(0, Money::minor($wallet->balance) - $held);
            $retained = min($order->amount_in_cents, $available);
            $wallet->update(['hold_balance' => Money::decimal($held + $retained), 'is_active' => false]);
            $review += ['wallet_id' => $wallet->id, 'held_amount' => Money::decimal($retained),
                'uncovered_amount' => Money::decimal($order->amount_in_cents - $retained), 'wallet_frozen' => true];
        } elseif ($order->purpose === 'membership') {
            app(MembershipService::class)->revokeVerifiedPayment($order->id, 'WOMPI_VOIDED');
            $review['membership_revoked'] = true;
        } elseif ($order->purpose === 'reservation') {
            app(CheckoutRefundService::class)->recordVerifiedVoid($order);
            $review['refund_verified'] = true;
            $metadata['resolution'] = 'REFUNDED';
        }
        $metadata['void_review'] = $review;
        $order->update(['status' => $order->purpose === 'reservation' ? 'VOIDED' : 'REVIEW', 'metadata' => $metadata]);
    }

}
