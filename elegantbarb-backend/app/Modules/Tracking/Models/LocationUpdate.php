<?php

namespace App\Modules\Tracking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LocationUpdate extends Model
{
    use HasFactory;

    protected $table = 'tracking.location_updates';

    protected $fillable = [
        'user_id', 'professional_id', 'trackable_type', 'trackable_id',
        'lat', 'lng', 'accuracy', 'speed', 'heading', 'recorded_at',
    ];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'accuracy' => 'decimal:2',
        'speed' => 'decimal:2',
        'heading' => 'decimal:2',
        'recorded_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }

    public function trackable()
    {
        return $this->morphTo();
    }
}
