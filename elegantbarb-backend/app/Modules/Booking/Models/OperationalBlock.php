<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Model;

final class OperationalBlock extends Model
{
    protected $table = 'booking.operational_blocks';
    protected $fillable = ['business_id', 'branch_id', 'professional_id', 'resource_id', 'kind', 'starts_at', 'ends_at', 'reason', 'created_by'];
    protected $casts = ['starts_at' => 'immutable_datetime', 'ends_at' => 'immutable_datetime'];
}
