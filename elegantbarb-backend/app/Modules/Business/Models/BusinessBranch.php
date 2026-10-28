<?php

namespace App\Modules\Business\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusinessBranch extends Model
{
    use HasFactory;

    protected $table = 'business.business_branches';

    protected $fillable = [
        'business_id',
        'name',
        'address',
        'city_id',
        'lat',
        'lng',
        'phone',
        'email',
        'is_main_branch',
        'is_active',
    ];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'is_main_branch' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'business_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(BranchSchedule::class, 'branch_id');
    }

    public function professionals()
    {
        return $this->hasMany(\App\Modules\People\Models\Professional::class, 'business_id')
            ->whereHas('availability', function ($q) {
                $q->where('branch_id', $this->id);
            });
    }

    public function services()
    {
        return $this->belongsToMany(\App\Modules\Catalog\Models\Service::class, 'catalog.branch_services', 'branch_id', 'service_id')
            ->withPivot('price_override', 'is_active')
            ->wherePivot('is_active', true);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(\App\Modules\Booking\Models\Appointment::class, 'branch_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
