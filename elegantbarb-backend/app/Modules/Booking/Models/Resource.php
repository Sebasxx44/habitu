<?php

namespace App\Modules\Booking\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Enums\ResourceType;

class Resource extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'booking.resources';

    protected $fillable = [
        'business_id',
        'branch_id',
        'name',
        'type',
        'description', 'attributes',
        'capacity',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'type' => ResourceType::class,
        'capacity' => 'integer', 'attributes' => 'array',
        'is_active' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\BusinessBranch::class, 'branch_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'resource_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOfType($query, ResourceType $type)
    {
        return $query->where('type', $type);
    }
}
