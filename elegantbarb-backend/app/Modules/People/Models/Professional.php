<?php

namespace App\Modules\People\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Professional extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'people.professionals';

    protected $fillable = [
        'user_id',
        'business_id',
        'name',
        'email',
        'phone',
        'specialty',
        'bio',
        'photo_url',
        'identification_number',
        'commission_percentage',
        'address',
        'birthday',
        'social_links',
        'is_active',
    ];

    protected $casts = [
        'commission_percentage' => 'decimal:2',
        'birthday' => 'date',
        'social_links' => 'json',
        'is_active' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function services()
    {
        return $this->belongsToMany(\App\Modules\Catalog\Models\Service::class, 'catalog.professional_services', 'professional_id', 'service_id')
            ->withPivot('branch_id', 'commission_percentage', 'duration_override', 'is_active')
            ->wherePivot('is_active', true);
    }

    public function availability(): HasMany
    {
        return $this->hasMany(ProfessionalAvailability::class, 'professional_id');
    }

    public function portfolios(): HasMany
    {
        return $this->hasMany(ProfessionalPortfolio::class, 'professional_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Appointment::class, 'professional_id');
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(\App\Modules\Finance\Models\ProfessionalPayout::class, 'professional_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(\App\Modules\Reviews\Models\Review::class, 'professional_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
