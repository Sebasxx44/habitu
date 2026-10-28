<?php

namespace App\Modules\People\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'people.clients';

    protected $fillable = [
        'user_id',
        'business_id',
        'name',
        'email',
        'phone',
        'birthdate',
        'notes',
        'loyalty_points',
        'xp_points',
        'tier',
        'is_vip',
        'referred_by',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'loyalty_points' => 'integer',
        'xp_points' => 'integer',
        'is_vip' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Appointment::class, 'client_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(\App\Modules\Reviews\Models\Review::class, 'client_id');
    }

    public function loyaltyCards(): HasMany
    {
        return $this->hasMany(\App\Modules\Loyalty\Models\LoyaltyCard::class, 'client_id');
    }

    public function favoriteProfessionals()
    {
        return $this->belongsToMany(Professional::class, 'people.favorite_professionals', 'client_id', 'professional_id')
            ->withTimestamps();
    }

    public function favoriteBusinesses()
    {
        return $this->belongsToMany(\App\Modules\Business\Models\Business::class, 'people.favorite_businesses', 'client_id', 'business_id')
            ->withTimestamps();
    }

    public function scopeOfBusiness($query, int $businessId)
    {
        return $query->where('business_id', $businessId);
    }
}
