<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BNPLApplication extends Model
{
    use HasFactory;

    protected $table = 'finance.bnpl_applications';

    protected $fillable = [
        'client_id', 'appointment_id', 'total_amount', 'installments_count',
        'interest_rate', 'status', 'provider', 'provider_reference',
        'approved_at', 'completed_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'approved_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function installments(): HasMany
    {
        return $this->hasMany(BNPLInstallment::class, 'bnpl_application_id')->orderBy('installment_number');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }
}
