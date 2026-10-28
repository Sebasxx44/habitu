<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DynamicPricingRule extends Model
{
    use HasFactory;

    protected $table = 'platform.dynamic_pricing_rules';

    protected $fillable = [
        'name', 'timezone', 'business_id', 'service_id', 'rule_type', 'conditions', 'multiplier',
        'flat_adjustment', 'priority', 'is_active', 'starts_at', 'ends_at',
    ];

    protected $casts = [
        'conditions' => 'json',
        'multiplier' => 'decimal:2',
        'flat_adjustment' => 'decimal:2',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\Service::class, 'service_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }
}
