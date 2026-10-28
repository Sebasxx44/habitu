<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecommendationLog extends Model
{
    use HasFactory;

    protected $table = 'platform.recommendation_logs';

    protected $fillable = [
        'user_id', 'recommendation_type', 'recommendable_type', 'recommendable_id',
        'score', 'algorithm', 'factors', 'was_clicked', 'was_booked',
        'clicked_at', 'booked_at',
    ];

    protected $casts = [
        'score' => 'decimal:4',
        'factors' => 'json',
        'was_clicked' => 'boolean',
        'was_booked' => 'boolean',
        'clicked_at' => 'datetime',
        'booked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function recommendable()
    {
        return $this->morphTo();
    }
}
