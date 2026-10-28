<?php

namespace App\Modules\Marketing\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ad extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'marketing.ads';

    protected $fillable = [
        'business_id', 'title', 'description', 'image_url', 'link_url',
        'placement', 'start_date', 'end_date', 'impression_limit', 'click_limit',
        'impressions_count', 'clicks_count', 'budget', 'spent', 'status',
        'targeting', 'priority', 'moderation_status', 'moderation_reason', 'moderated_by', 'moderated_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'budget' => 'decimal:2',
        'spent' => 'decimal:2',
        'targeting' => 'json',
        'impressions_count' => 'integer',
        'clicks_count' => 'integer',
        'impression_limit' => 'integer',
        'click_limit' => 'integer',
        'priority' => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function impressions(): HasMany
    {
        return $this->hasMany(AdImpression::class, 'ad_id');
    }

    public function clicks(): HasMany
    {
        return $this->hasMany(AdClick::class, 'ad_id');
    }

    public function recordImpression(?int $userId = null, ?string $context = null): void
    {
        $this->impressions()->create(['user_id' => $userId, 'context' => $context]);
        $this->increment('impressions_count');
    }

    public function recordClick(?int $userId = null, ?string $context = null): void
    {
        $this->clicks()->create(['user_id' => $userId, 'context' => $context]);
        $this->increment('clicks_count');
    }

    public function scopeActiveForPlacement($query, string $placement)
    {
        return $query->where('placement', $placement)
            ->where('status', 'ACTIVE')->where('moderation_status', 'APPROVED')->whereHas('business', fn ($business) => $business->where('is_active', true))
            ->whereDate('start_date', '<=', now())
            ->whereDate('end_date', '>=', now())
            ->where(function ($q) {
                $q->whereNull('impression_limit')
                  ->orWhereRaw('impressions_count < impression_limit');
            })
            ->where(function ($q) {
                $q->whereNull('click_limit')
                  ->orWhereRaw('clicks_count < click_limit');
            })
            ->orderByDesc('priority');
    }
}
