<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIMessage extends Model
{
    use HasFactory;

    protected $table = 'platform.ai_messages';

    protected $fillable = [
        'conversation_id', 'role', 'content', 'metadata', 'tool_calls',
    ];

    protected $casts = [
        'metadata' => 'json',
        'tool_calls' => 'json',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AIConversation::class, 'conversation_id');
    }
}
