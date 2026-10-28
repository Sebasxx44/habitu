<?php

namespace App\Modules\Reviews\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $table = 'reviews.reviews';

    protected $fillable = [
        'business_id',
        'branch_id',
        'professional_id',
        'client_id',
        'appointment_id',
        'rating',
        'service_rating',
        'professional_rating',
        'business_rating',
        'comment',
        'is_verified',
        'business_response',
        'responded_at',
        'is_active',
    ];

    protected $casts = [
        'rating' => 'integer',
        'service_rating' => 'integer',
        'professional_rating' => 'integer',
        'business_rating' => 'integer',
        'is_verified' => 'boolean',
        'responded_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Booking\Models\Appointment::class, 'appointment_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }
}
