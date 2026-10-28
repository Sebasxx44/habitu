<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SmartQueue extends Model
{
    use HasFactory;

    protected $table = 'booking.smart_queues';

    protected $fillable = [
        'business_id', 'branch_id', 'name', 'status', 'current_number', 'estimated_wait_minutes',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\BusinessBranch::class, 'branch_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(SmartQueueEntry::class, 'queue_id');
    }

    public function displays(): HasMany
    {
        return $this->hasMany(SmartQueueDisplay::class, 'queue_id');
    }
}
