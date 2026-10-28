<?php

namespace App\Modules\Loyalty\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyCard extends Model
{
    use HasFactory;

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
        'last_stamp_at',
    ];

    protected $casts = [
        'current_stamps' => 'integer',
        'total_stamps_ever' => 'integer',
        'rewards_redeemed' => 'integer',
        'reward_available' => 'boolean',
        'last_stamp_at' => 'datetime',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(LoyaltyProgram::class, 'loyalty_program_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\People\Models\Client::class, 'client_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class, 'loyalty_card_id');
    }
}
