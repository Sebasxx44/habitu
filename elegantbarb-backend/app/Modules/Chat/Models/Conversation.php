<?php

namespace App\Modules\Chat\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Conversation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'chat.conversations';

    protected $fillable = [
        'type', 'subject', 'business_id', 'appointment_id', 'on_demand_request_id',
        'is_active', 'last_message_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_message_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Business\Models\Business::class, 'business_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Booking\Models\Appointment::class, 'appointment_id');
    }

    public function onDemandRequest(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\OnDemand\Models\OnDemandRequest::class, 'on_demand_request_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class, 'conversation_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->whereHas('participants', fn($q) => $q->where('user_id', $userId));
    }
}
