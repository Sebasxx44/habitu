<?php

namespace App\Modules\Marketing\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionRedemption extends Model
{
    use HasFactory;

    protected $table = 'marketing.promotion_redemptions';

    public $timestamps = true;
    const UPDATED_AT = null;

    protected $fillable = [
        'promotion_id', 'client_id', 'appointment_id', 'saved_amount',
    ];

    protected $casts = [
        'saved_amount' => 'decimal:2',
    ];

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class, 'promotion_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Booking\Models\Appointment::class, 'appointment_id');
    }
}
