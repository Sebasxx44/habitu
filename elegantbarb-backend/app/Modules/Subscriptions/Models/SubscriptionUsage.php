<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionUsage extends Model
{
    use HasFactory;

    protected $table = 'subscriptions.subscription_usages';

    protected $fillable = [
        'user_subscription_id', 'usage_type', 'source_id', 'source_type',
        'credits_used', 'discount_applied', 'description',
    ];

    protected $casts = [
        'discount_applied' => 'decimal:2',
    ];

    public function userSubscription(): BelongsTo
    {
        return $this->belongsTo(UserSubscription::class, 'user_subscription_id');
    }
}
