<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SplitPayment extends Model
{
    use HasFactory;

    protected $table = 'finance.split_payments';

    protected $fillable = [
        'appointment_id', 'total_amount', 'split_count', 'status',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
    ];

    public function participants(): HasMany
    {
        return $this->hasMany(SplitPaymentParticipant::class, 'split_payment_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Booking\Models\Appointment::class, 'appointment_id');
    }
}
