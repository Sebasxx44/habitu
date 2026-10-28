<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\Support\Money;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Platform\Services\MarketplaceOutbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class WithdrawalService
{
    public function summary(int $userId): array
    {
        $pending = DB::table('finance.withdrawals')->where('user_id', $userId)->whereIn('status', ['PENDING', 'IN_REVIEW'])->sum('amount');
        $requests = DB::table('finance.withdrawals')->where('user_id', $userId)->orderByDesc('id')->limit(30)->get();
        return ['reserved_for_withdrawal' => Money::decimal(Money::minor((string) $pending)), 'transfer_provider_enabled' => false,
            'withdrawals' => $requests->map(fn ($withdrawal) => ['id' => $withdrawal->id, 'amount' => $withdrawal->amount,
                'status' => $withdrawal->status, 'bank_name' => $withdrawal->bank_name, 'bank_account_last4' => substr($withdrawal->bank_account, -4),
                'created_at' => $withdrawal->created_at, 'processed_at' => $withdrawal->processed_at,
                'provider_confirmed' => false, 'can_cancel' => $withdrawal->status === 'PENDING'])->all()];
    }

    public function emit(int $withdrawalId): void
    {
        $row = DB::table('finance.withdrawals')->where('id', $withdrawalId)->firstOrFail();
        app(MarketplaceOutbox::class)->record('payout:'.$row->id.':'.$row->status, 'payout.updated', null, $row->user_id,
            ['withdrawal_id' => $row->id, 'status' => $row->status, 'amount' => Money::decimal(Money::minor((string) $row->amount)), 'currency' => 'COP', 'provider_confirmed' => false]);
    }

    public function cancel(int $userId, int $withdrawalId): void
    {
        DB::transaction(function () use ($userId, $withdrawalId) {
            $wallet = Wallet::where('user_id', $userId)->lockForUpdate()->firstOrFail();
            $withdrawal = DB::table('finance.withdrawals')->where('id', $withdrawalId)->where('user_id', $userId)->lockForUpdate()->first();
            abort_unless($withdrawal, 404);
            if ($withdrawal->status === 'CANCELLED') return;
            if ($withdrawal->status !== 'PENDING') throw ValidationException::withMessages(['status' => 'Solo se pueden cancelar solicitudes que todavía no se han enviado al proveedor.']);
            $debit = $wallet->transactions()->where('source_type', 'WITHDRAWAL')->where('source_id', $withdrawalId)->where('type', 'DEBIT')->first();
            if (! $debit || Money::minor($debit->amount) !== Money::minor((string) $withdrawal->amount)) throw ValidationException::withMessages(['status' => 'El retiro requiere conciliación antes de restituir fondos.']);
            $wallet->refund((string) $withdrawal->amount, ['external_reference' => 'WITHDRAWAL_CANCEL:'.$withdrawalId,
                'source_type' => 'WITHDRAWAL_REVERSAL', 'source_id' => $withdrawalId, 'description' => 'Cancelación de retiro pendiente',
                'metadata' => ['original_transaction_id' => $debit->id]]);
            DB::table('finance.withdrawals')->where('id', $withdrawalId)->update(['status' => 'CANCELLED', 'updated_at' => now()]);
            $this->emit($withdrawalId);
        });
    }
}
