<?php

namespace App\Modules\Business\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Business extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'business.businesses';

    protected $fillable = [
        'business_category_id',
        'owner_user_id',
        'name',
        'slug',
        'description',
        'email',
        'phone',
        'website',
        'tax_id',
        'logo_url',
        'banner_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'verified',
        'rating',
        'reviews_count',
        'license_id',
        'is_active',
        'uses_professionals',
        'uses_resources',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'rating' => 'decimal:1',
        'is_active' => 'boolean',
        'uses_professionals' => 'boolean',
        'uses_resources' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Platform\Models\BusinessCategory::class, 'business_category_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'owner_user_id');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(BusinessBranch::class, 'business_id');
    }

    public function mainBranch(): BelongsTo
    {
        return $this->belongsTo(BusinessBranch::class, 'id', 'business_id')
            ->where('is_main_branch', true);
    }

    public function socialLinks(): HasMany
    {
        return $this->hasMany(BusinessSocialLink::class, 'business_id');
    }

    public function professionals(): HasMany
    {
        return $this->hasMany(\App\Modules\People\Models\Professional::class, 'business_id');
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(\App\Modules\Marketing\Models\Promotion::class, 'business_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(\App\Modules\Catalog\Models\Service::class, 'business_id');
    }

    public function clients(): HasMany
    {
        return $this->hasMany(\App\Modules\People\Models\Client::class, 'business_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Appointment::class, 'business_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(\App\Modules\Reviews\Models\Review::class, 'business_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Resource::class, 'business_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeVerified($query)
    {
        return $query->where('verified', true);
    }
}
