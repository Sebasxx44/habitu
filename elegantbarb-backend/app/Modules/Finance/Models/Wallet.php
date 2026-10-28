<?php

namespace App\Modules\Finance\Models;

use App\Core\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Wallet extends Model
{
    use HasFactory;

    protected $table = 'finance.wallets';

    protected $fillable = [
        'user_id', 'balance', 'hold_balance', 'currency', 'is_active',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'hold_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class, 'wallet_id');
    }

    public function credit(float|int|string $amount, array $meta = []): WalletTransaction
    {
        return $this->addTransaction('CREDIT', $amount, $meta);
    }

    public function payout(float|int|string $amount, array $meta = []): WalletTransaction
    {
        return $this->addTransaction('PAYOUT', $amount, $meta);
    }

    public function debit(float|int|string $amount, array $meta = []): WalletTransaction
    {
        return $this->addTransaction('DEBIT', $amount, $meta);
    }

    public function cashback(float|int|string $amount, array $meta = []): WalletTransaction
    {
        return $this->addTransaction('CASHBACK', $amount, $meta);
    }

    public function refund(float|int|string $amount, array $meta = []): WalletTransaction
    {
        return $this->addTransaction('REFUND', $amount, $meta);
    }

    protected function addTransaction(string $type, float|int|string $amount, array $meta): WalletTransaction
    {
        return DB::transaction(fn () => $this->applyTransaction($type, $amount, $meta));
    }

    private function applyTransaction(string $type, float|int|string $amount, array $meta): WalletTransaction
    {
        $wallet = self::whereKey($this->id)->lockForUpdate()->firstOrFail();
        $minor = Money::minor($amount);
        if ($minor <= 0 || (! $wallet->is_active && $type === 'DEBIT')) {
            throw new \InvalidArgumentException('El monto o la billetera no son válidos.');
        }
        // Frozen accounts still receive verified payments/refunds in the ledger;
        // incoming funds never reactivate an account or become spendable.
        $reference = $meta['external_reference'] ?? null;
        if ($reference !== null && $reference !== '') {
            $existing = $wallet->transactions()->where('external_reference', $reference)->first();
            if ($existing) {
                if ($existing->type !== $type || Money::minor($existing->amount) !== $minor) {
                    throw new \InvalidArgumentException('La referencia ya fue utilizada con otro monto.');
                }
                return $existing;
            }
        }
        $before = Money::minor($wallet->balance);
        $held = Money::minor($wallet->hold_balance);
        if ($type === 'DEBIT' && $before - $held < $minor) {
            throw new \InvalidArgumentException('Saldo disponible insuficiente.');
        }
        $after = $type === 'DEBIT' ? $before - $minor : $before + $minor;
        $tx = $wallet->transactions()->create([
            'user_id' => $wallet->user_id,
            'type' => $type,
            'amount' => Money::decimal($minor),
            'balance_before' => Money::decimal($before),
            'balance_after' => Money::decimal($after),
            'status' => 'COMPLETED',
            'description' => $meta['description'] ?? null,
            'source_type' => $meta['source_type'] ?? null,
            'source_id' => $meta['source_id'] ?? null,
            'payment_method' => $meta['payment_method'] ?? null,
            'external_reference' => $reference,
            'metadata' => $meta['metadata'] ?? null,
        ]);
        $wallet->update(['balance' => Money::decimal($after)]);
        $this->setRawAttributes($wallet->getAttributes(), true);
        return $tx;
    }
}
