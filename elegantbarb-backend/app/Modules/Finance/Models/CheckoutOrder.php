<?php

declare(strict_types=1);

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;

final class CheckoutOrder extends Model
{
    protected $table = 'finance.checkout_orders';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected $casts = ['metadata' => 'array', 'expires_at' => 'immutable_datetime', 'credited_at' => 'immutable_datetime', 'amount_in_cents' => 'integer', 'target_id' => 'integer'];
}
