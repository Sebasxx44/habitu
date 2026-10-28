<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyCard extends Model
{
    protected $table = 'loyalty.loyalty_cards';

    protected $fillable = [
        'loyalty_program_id',
        'client_id',
        'business_id',
        'current_stamps',
        'total_stamps_ever',
        'rewards_redeemed',
        'reward_available',
        'status',
        'last_stamp_at'
    ];

    protected $casts = [
        'current_stamps' => 'integer',
        'total_stamps_ever' => 'integer',
        'rewards_redeemed' => 'integer',
        'reward_available' => 'boolean',
        'last_stamp_at' => 'datetime'
    ];

    public function program()
    {
        return $this->belongsTo(LoyaltyProgram::class, 'loyalty_program_id');
    }

    public function client()
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }
}
