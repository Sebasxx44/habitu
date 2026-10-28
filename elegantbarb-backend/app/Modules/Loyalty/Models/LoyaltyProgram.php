<?php

namespace App\Modules\Loyalty\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyProgram extends Model
{
    use HasFactory;

    protected $table = 'loyalty.loyalty_programs';

    protected $fillable = [
        'business_id',
        'professional_id',
        'service_id',
        'name',
        'description',
        'type',
        'stamps_required',
        'reward_description',
        'active',
        'valid_until',
    ];

    protected $casts = [
        'stamps_required' => 'integer',
        'active' => 'boolean',
        'valid_until' => 'date',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function professional(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Professional::class, 'professional_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Catalog\Models\Service::class, 'service_id');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(LoyaltyCard::class, 'loyalty_program_id');
    }
}
