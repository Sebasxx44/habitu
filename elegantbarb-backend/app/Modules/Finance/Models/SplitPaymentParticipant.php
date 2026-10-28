<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SplitPaymentParticipant extends Model
{
    use HasFactory;

    protected $table = 'finance.split_payment_participants';

    protected $fillable = [
        'split_payment_id', 'user_id', 'amount', 'status', 'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function splitPayment(): BelongsTo
    {
        return $this->belongsTo(SplitPayment::class, 'split_payment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }
}
