<?php

namespace App\Modules\Marketing\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use HasFactory;

    protected $table = 'marketing.promotions';

    protected $fillable = [
        'business_id',
        'business_category_id',
        'title',
        'description',
        'discount',
        'type',
        'min_purchase',
        'max_discount',
        'per_user_limit',
        'start_date',
        'end_date',
        'promo_code',
        'image_url',
        'usage_limit',
        'usage_count',
        'is_active',
    ];

    protected $casts = [
        'discount' => 'decimal:2',
        'min_purchase' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'per_user_limit' => 'integer',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function services(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(\App\Modules\Catalog\Models\Service::class, 'marketing.promotion_service')
            ->withPivot('discount', 'type')->withTimestamps();
    }

    public function usages(): HasMany
    {
        return $this->hasMany(PromotionRedemption::class, 'promotion_id');
    }

    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }
        
        $now = now(config('booking.timezone'));
        if ($this->start_date && $now->lt(\Carbon\CarbonImmutable::parse($this->start_date->toDateString(), config('booking.timezone'))->startOfDay())) {
            return false;
        }
        if ($this->end_date && $now->gt(\Carbon\CarbonImmutable::parse($this->end_date->toDateString(), config('booking.timezone'))->endOfDay())) {
            return false;
        }
        
        if ($this->usage_limit !== null && $this->usage_count >= $this->usage_limit) {
            return false;
        }
        
        return true;
    }

    public function canUseBy(int $userId): bool
    {
        if (! app(\App\Modules\Marketing\Services\ReferralService::class)->canUseReward($this->id, $userId)) return false;
        if (!$this->isValid()) {
            return false;
        }
        
        // Check if user has a client profile
        $clientIds = \App\Modules\People\Models\Client::where('user_id', $userId)->pluck('id');
        if ($clientIds->isEmpty()) {
            return false;
        }

        if ($this->per_user_limit !== null) {
            $userUsageCount = $this->usages()->whereIn('client_id', $clientIds)->count();
            if ($userUsageCount >= $this->per_user_limit) {
                return false;
            }
        }
        
        return true;
    }

    public function calculateDiscount(float $subtotal): float
    {
        $discountValue = (float) $this->discount;
        $discount = $this->type === 'PERCENTAGE'
            ? $subtotal * ($discountValue / 100)
            : $discountValue;

        if ($this->max_discount !== null) {
            $discount = min($discount, (float) $this->max_discount);
        }

        return round(max(0, min($subtotal, $discount)), 2);
    }

    public function scopeActiveAndValid($query)
    {
        return $query->where('is_active', true)
            ->whereDate('start_date', '<=', now(config('booking.timezone'))->toDateString())
            ->whereDate('end_date', '>=', now(config('booking.timezone'))->toDateString())
            ->where(function ($q) {
                $q->whereNull('usage_limit')
                  ->orWhereRaw('usage_count < usage_limit');
            });
    }

    // Accessors & Mutators for backwards compatibility
    public function getNameAttribute(): ?string
    {
        return $this->title;
    }

    public function setNameAttribute(?string $value): void
    {
        $this->attributes['title'] = $value;
    }

    public function getCodeAttribute(): ?string
    {
        return $this->promo_code;
    }

    public function setCodeAttribute(?string $value): void
    {
        $this->attributes['promo_code'] = $value;
    }

    public function getValueAttribute()
    {
        return $this->discount;
    }

    public function setValueAttribute($value): void
    {
        $this->attributes['discount'] = $value;
    }

    public function getStartsAtAttribute()
    {
        return $this->start_date;
    }

    public function setStartsAtAttribute($value): void
    {
        $this->attributes['start_date'] = $value;
    }

    public function getEndsAtAttribute()
    {
        return $this->end_date;
    }

    public function setEndsAtAttribute($value): void
    {
        $this->attributes['end_date'] = $value;
    }

    public function getAppliesToAttribute()
    {
        return 'ALL';
    }

    public function getApplicableServiceIdsAttribute()
    {
        return [];
    }

    public function getApplicableCategoryIdsAttribute()
    {
        return [];
    }
}
