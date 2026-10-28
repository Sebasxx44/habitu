<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientMembership extends Model
{
    use HasFactory;

    protected $table = 'subscriptions.client_memberships';

    protected $fillable = [
        'client_id', 'membership_plan_id', 'status', 'starts_at', 'ends_at',
        'appointments_used', 'appointments_remaining', 'auto_renew', 'cancelled_at', 'payment_reference', 'plan_snapshot',
    ];

    protected $casts = [
        'plan_snapshot' => 'array',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'auto_renew' => 'boolean',
        'appointments_used' => 'integer',
        'appointments_remaining' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MembershipPlan::class, 'membership_plan_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(MembershipUsage::class, 'client_membership_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE' && $this->starts_at->lte(now()) && $this->ends_at->isFuture();
    }
}
