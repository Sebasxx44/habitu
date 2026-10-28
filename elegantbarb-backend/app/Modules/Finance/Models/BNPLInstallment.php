<?php

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BNPLInstallment extends Model
{
    use HasFactory;

    protected $table = 'finance.bnpl_installments';

    protected $fillable = [
        'bnpl_application_id', 'installment_number', 'amount', 'due_date',
        'paid_date', 'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_date' => 'date',
    ];

    public function application(): BelongsTo
    {
        return $this->belongsTo(BNPLApplication::class, 'bnpl_application_id');
    }
}
