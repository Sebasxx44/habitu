<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'subscriptions.plans';

    protected $fillable = [
        'name', 'slug', 'description', 'billing_cycle', 'price', 'currency',
        'credits_per_cycle', 'max_appointments_per_cycle', 'max_on_demand_per_cycle',
        'discount_percentage', 'included_services', 'features', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'included_services' => 'json',
        'features' => 'json',
        'is_active' => 'boolean',
        'credits_per_cycle' => 'integer',
        'max_appointments_per_cycle' => 'integer',
        'max_on_demand_per_cycle' => 'integer',
    ];

    public function userSubscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class, 'plan_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
