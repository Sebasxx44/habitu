<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Models;

use Illuminate\Database\Eloquent\Model;

final class ServiceGift extends Model
{
    protected $table = 'loyalty.service_gifts';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $guarded = [];
    protected $casts = ['snapshot' => 'array', 'expires_at' => 'immutable_datetime', 'redeemed_at' => 'immutable_datetime'];
}
