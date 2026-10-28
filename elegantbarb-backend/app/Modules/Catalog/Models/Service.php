<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'catalog.services';

    protected $fillable = [
        'business_id',
        'service_category_id',
        'name',
        'description',
        'price',
        'duration_minutes',
        'buffer_minutes',
        'min_participants',
        'max_participants',
        'image_url',
        'media_gallery',
        'requires_professional',
        'booking_model', 'duration_mode', 'duration_options', 'booking_capacity', 'slot_interval_minutes',
        'min_advance_minutes', 'max_advance_days', 'requires_confirmation', 'allow_cancellation', 'allow_reschedule',
        'cancellation_notice_minutes', 'reschedule_notice_minutes', 'resource_professional_optional',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration_minutes' => 'integer',
        'buffer_minutes' => 'integer',
        'min_participants' => 'integer',
        'max_participants' => 'integer',
        'media_gallery' => 'json',
        'requires_professional' => 'boolean',
        'is_active' => 'boolean',
        'duration_options' => 'array', 'booking_capacity' => 'integer', 'slot_interval_minutes' => 'integer',
        'min_advance_minutes' => 'integer', 'max_advance_days' => 'integer', 'requires_confirmation' => 'boolean',
        'allow_cancellation' => 'boolean', 'allow_reschedule' => 'boolean', 'cancellation_notice_minutes' => 'integer',
        'reschedule_notice_minutes' => 'integer', 'resource_professional_optional' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Appointment::class, 'service_id');
    }

    public function professionals()
    {
        return $this->belongsToMany(\App\Modules\People\Models\Professional::class, 'catalog.professional_services', 'service_id', 'professional_id')
            ->withPivot('branch_id', 'commission_percentage', 'duration_override', 'is_active')
            ->wherePivot('is_active', true);
    }

    public function branches()
    {
        return $this->belongsToMany(\App\Modules\Business\Models\BusinessBranch::class, 'catalog.branch_services', 'service_id', 'branch_id')
            ->withPivot('price_override', 'is_active')
            ->wherePivot('is_active', true);
    }

    public function resources()
    {
        return $this->belongsToMany(\App\Modules\Booking\Models\Resource::class, 'catalog.resource_services', 'service_id', 'resource_id')
            ->withPivot('is_active')->wherePivot('is_active', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRequiresProfessional($query)
    {
        return $query->where('requires_professional', true);
    }
}
