<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Leaderboard extends Model
{
    use HasFactory;

    protected $table = 'platform.leaderboards';

    protected $fillable = [
        'business_id', 'type', 'period', 'period_start', 'period_end',
        'user_id', 'rank', 'total_points', 'appointments_count', 'total_spent',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'rank' => 'integer',
        'total_points' => 'integer',
        'appointments_count' => 'integer',
        'total_spent' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }
}
