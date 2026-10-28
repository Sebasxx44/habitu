<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MembershipPlan extends Model
{
    use HasFactory;

    protected $table = 'subscriptions.membership_plans';

    protected $fillable = [
        'business_id', 'name', 'slug', 'description', 'price', 'currency',
        'billing_cycle', 'appointments_included', 'included_services',
        'discount_percentage', 'benefits', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'included_services' => 'json',
        'benefits' => 'json',
        'is_active' => 'boolean',
        'appointments_included' => 'integer',
        'sort_order' => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function clientMemberships(): HasMany
    {
        return $this->hasMany(ClientMembership::class, 'membership_plan_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
