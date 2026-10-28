<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class GamificationXP extends Model
{
    use HasFactory;

    protected $table = 'platform.gamification_xp';

    protected $fillable = [
        'user_id', 'points', 'action', 'description', 'source_type', 'source_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
