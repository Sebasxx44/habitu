<?php

namespace App\Modules\OnDemand\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OnDemandRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'on_demand.requests';

    protected $fillable = [
        'client_id', 'business_id', 'service_id', 'professional_id',
        'request_code', 'status', 'description', 'metadata',
        'estimated_price', 'final_price', 'currency',
        'client_lat', 'client_lng', 'client_address',
        'professional_lat', 'professional_lng',
        'accepted_at', 'arrived_at', 'started_at', 'completed_at',
        'cancelled_at', 'cancellation_reason', 'cancelled_by',
        'search_timeout_seconds', 'search_expires_at',
    ];

    protected $casts = [
        'metadata' => 'json',
        'client_lat' => 'decimal:8',
        'client_lng' => 'decimal:8',
        'professional_lat' => 'decimal:8',
        'professional_lng' => 'decimal:8',
        'estimated_price' => 'decimal:2',
        'final_price' => 'decimal:2',
        'accepted_at' => 'datetime',
        'arrived_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'search_expires_at' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\Service::class, 'service_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(OnDemandAssignment::class, 'request_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OnDemandStatusHistory::class, 'request_id');
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['COMPLETED', 'CANCELLED']);
    }

    public function scopeSearching($query)
    {
        return $query->where('status', 'SEARCHING');
    }
}
