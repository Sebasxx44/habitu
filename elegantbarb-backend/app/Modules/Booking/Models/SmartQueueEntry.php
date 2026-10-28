<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmartQueueEntry extends Model
{
    use HasFactory;

    protected $table = 'booking.smart_queue_entries';

    protected $fillable = [
        'queue_id', 'client_id', 'ticket_number', 'status', 'estimated_wait_minutes',
        'called_at', 'served_at', 'completed_at',
    ];

    protected $casts = [
        'called_at' => 'datetime',
        'served_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function queue(): BelongsTo
    {
        return $this->belongsTo(SmartQueue::class, 'queue_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }
}
