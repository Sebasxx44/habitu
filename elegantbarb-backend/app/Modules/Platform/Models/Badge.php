<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Badge extends Model
{
    use HasFactory;

    protected $table = 'platform.gamification_badges';

    protected $fillable = [
        'name', 'slug', 'description', 'icon', 'color', 'category',
        'required_points', 'conditions', 'is_active',
    ];

    protected $casts = [
        'conditions' => 'json',
        'is_active' => 'boolean',
        'required_points' => 'integer',
    ];

    public function userBadges(): HasMany
    {
        return $this->hasMany(UserBadge::class, 'badge_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
