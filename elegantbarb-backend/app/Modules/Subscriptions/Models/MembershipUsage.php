<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembershipUsage extends Model
{
    use HasFactory;

    protected $table = 'subscriptions.membership_usage';

    protected $fillable = [
        'client_membership_id', 'appointment_id', 'usage_type', 'discount_applied', 'restored_at',
    ];

    protected $casts = [
        'discount_applied' => 'decimal:2', 'restored_at' => 'datetime',
    ];

    public function clientMembership(): BelongsTo
    {
        return $this->belongsTo(ClientMembership::class, 'client_membership_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Booking\Models\Appointment::class, 'appointment_id');
    }
}
