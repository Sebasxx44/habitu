<?php

declare(strict_types=1);

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;

final class CheckoutRefund extends Model
{
    protected $table = 'finance.checkout_refunds';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['amount_in_cents' => 'integer', 'completed_at' => 'immutable_datetime'];
}
