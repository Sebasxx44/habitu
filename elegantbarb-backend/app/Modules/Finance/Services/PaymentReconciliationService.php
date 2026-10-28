<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\DTOs\ServiceResponse;
use App\Core\Support\Money;
use App\Modules\Finance\Models\Wallet;
use Illuminate\Support\Facades\DB;

final class PaymentReconciliationService
{
    public function reconcile(array $payment): ServiceResponse
    {
        $reference = $payment['external_reference'] ?? '';
        if (! is_string($reference) || $reference === '') {
            return ServiceResponse::success(null, 'Evento sin referencia local.');
        }
        return DB::transaction(fn () => $this->apply($payment, $reference));
    }

    private function apply(array $payment, string $reference): ServiceResponse
    {
        $walletPayment = str_starts_with($reference, 'WALLET-TOPUP-');
        if (! $walletPayment && ! str_starts_with($reference, 'APPOINTMENT-')) {
            return ServiceResponse::success(null, 'Evento no aplicable.');
        }
        $table = $walletPayment ? 'finance.wallet_topups' : 'finance.payments';
        $record = DB::table($table)->where('external_reference', $reference)->lockForUpdate()->first();
        if (! $record) {
            return ServiceResponse::notFound('Referencia de pago');
        }
        if (in_array($record->status, ['COMPLETED', 'PAID', 'REFUNDED'], true)) {
            return ServiceResponse::success(null, 'Pago procesado previamente.');
        }
        if (($payment['status'] ?? '') !== 'approved') {
            return ServiceResponse::success(null, 'El pago aún no está aprobado.');
        }
        if (empty($payment['payment_id']) || ($payment['currency'] ?? '') !== 'COP'
            || Money::minor($payment['amount'] ?? 0) !== Money::minor($record->amount)) {
            return ServiceResponse::error('El monto o la moneda del pago no coinciden.', null, 422);
        }
        if ($walletPayment) {
            $wallet = app(\App\Modules\Finance\Repositories\WalletRepository::class)->getOrCreate((int) $record->user_id);
            $wallet->credit((string) $record->amount, [
                'description' => 'Recarga confirmada por MercadoPago',
                'external_reference' => 'MP:' . $payment['payment_id'],
                'source_type' => 'WALLET_TOPUP', 'source_id' => $record->id,
                'payment_method' => 'MERCADOPAGO',
            ]);
            DB::table($table)->where('id', $record->id)->update([
                'status' => 'COMPLETED', 'payment_id' => (string) $payment['payment_id'], 'updated_at' => now(),
            ]);
        } else {
            DB::table($table)->where('id', $record->id)->update([
                'status' => 'COMPLETED', 'external_transaction_id' => (string) $payment['payment_id'],
                'paid_at' => now(), 'updated_at' => now(),
            ]);
            // Receiving payment must never revive a cancelled/completed appointment.
            DB::table('booking.appointments')->where('id', $record->appointment_id)
                ->update(['payment_status' => 'PAID', 'updated_at' => now()]);
            DB::table('booking.appointments')->where('id', $record->appointment_id)->where('status', 'PENDING')
                ->update(['status' => 'CONFIRMED', 'updated_at' => now()]);
        }
        return ServiceResponse::success(null, 'Pago confirmado.');
    }
}
