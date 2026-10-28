<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmartQueueDisplay extends Model
{
    use HasFactory;

    protected $table = 'booking.smart_queue_displays';

    protected $fillable = [
        'queue_id', 'display_name', 'display_code', 'settings',
    ];

    protected $casts = [
        'settings' => 'json',
    ];

    public function queue(): BelongsTo
    {
        return $this->belongsTo(SmartQueue::class, 'queue_id');
    }
}
