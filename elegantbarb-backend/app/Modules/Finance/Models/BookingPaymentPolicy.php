<?php

declare(strict_types=1);

namespace App\Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;

final class BookingPaymentPolicy extends Model
{
    protected $table = 'finance.booking_payment_policies';
    protected $primaryKey = 'business_id';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['allowed_modes' => 'array', 'deposit_percentage' => 'integer', 'hold_minutes' => 'integer', 'version' => 'integer'];
}
