<?php

namespace App\Modules\Subscriptions\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class UserSubscription extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'subscriptions.user_subscriptions';

    protected $fillable = [
        'user_id', 'plan_id', 'status', 'starts_at', 'ends_at',
        'cancelled_at', 'cancellation_reason', 'auto_renew',
        'credits_remaining', 'appointments_used', 'on_demand_used',
        'payment_method', 'external_subscription_id',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'auto_renew' => 'boolean',
        'credits_remaining' => 'integer',
        'appointments_used' => 'integer',
        'on_demand_used' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(SubscriptionUsage::class, 'user_subscription_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE' && $this->ends_at->isFuture();
    }

    public function hasCredits(): bool
    {
        return $this->credits_remaining > 0;
    }

    public function consumeCredit(string $usageType, array $meta = []): SubscriptionUsage
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($usageType, $meta) {
            $subscription = self::whereKey($this->id)->lockForUpdate()->firstOrFail();
            if (! in_array($usageType, ['APPOINTMENT', 'ON_DEMAND'], true)) {
                throw new \InvalidArgumentException('Tipo de consumo inválido.');
            }
            if (! empty($meta['source_id']) && ! empty($meta['source_type'])) {
                $previous = $subscription->usages()->where('source_id', $meta['source_id'])->where('source_type', $meta['source_type'])->first();
                if ($previous) {
                    if ($previous->usage_type !== $usageType) {
                        throw new \InvalidArgumentException('La referencia corresponde a otro consumo.');
                    }
                    return $previous;
                }
            }
            if (! $subscription->isActive() || ! $subscription->hasCredits()) {
                throw new \RuntimeException('No hay créditos disponibles en una suscripción activa.');
            }
            $counter = $usageType === 'APPOINTMENT' ? 'appointments_used' : 'on_demand_used';
            $limit = $usageType === 'APPOINTMENT' ? $subscription->plan->max_appointments_per_cycle : $subscription->plan->max_on_demand_per_cycle;
            if ($limit !== null && $subscription->$counter >= $limit) {
                throw new \RuntimeException('Se alcanzó el límite de usos de este plan.');
            }
            $subscription->decrement('credits_remaining');
            $subscription->increment($counter);
            return $subscription->usages()->create([
                'usage_type' => $usageType, 'source_id' => $meta['source_id'] ?? null,
                'source_type' => $meta['source_type'] ?? null, 'credits_used' => 1,
                'discount_applied' => \App\Core\Support\Money::decimal(\App\Core\Support\Money::minor($meta['discount_applied'] ?? 0)),
                'description' => $meta['description'] ?? null,
            ]);
        });
    }
}
