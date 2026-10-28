<?php

namespace App\Modules\OnDemand\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnDemandAssignment extends Model
{
    use HasFactory;

    protected $table = 'on_demand.assignments';

    protected $fillable = [
        'request_id', 'professional_id', 'status',
        'offered_at', 'responded_at', 'is_auto_assigned', 'distance_km',
    ];

    protected $casts = [
        'is_auto_assigned' => 'boolean',
        'distance_km' => 'decimal:2',
        'offered_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(OnDemandRequest::class, 'request_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }
}
