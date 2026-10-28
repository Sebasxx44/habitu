<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DynamicPricingSnapshot extends Model
{
    use HasFactory;

    protected $table = 'platform.dynamic_pricing_snapshots';

    protected $fillable = [
        'business_id', 'date', 'hour', 'base_price', 'final_price',
        'applied_rules', 'demand_score',
    ];

    protected $casts = [
        'date' => 'date',
        'base_price' => 'decimal:2',
        'final_price' => 'decimal:2',
        'applied_rules' => 'json',
        'demand_score' => 'decimal:2',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }
}
