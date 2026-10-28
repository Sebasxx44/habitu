<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyProgram extends Model
{
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
        'valid_until'
    ];

    protected $casts = [
        'active' => 'boolean',
        'valid_until' => 'date',
        'stamps_required' => 'integer',
    ];

    public function cards()
    {
        return $this->hasMany(LoyaltyCard::class, 'loyalty_program_id');
    }
}
