<?php

namespace App\Modules\Platform\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'marketing.notifications';

    protected $fillable = [
        'user_id', 'type', 'title', 'message', 'data', 'read', 'read_at',
    ];

    protected $casts = [
        'data' => 'json',
        'read' => 'boolean',
        'read_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::created(function (self $notification) {
            if (config('push.enabled')) {
                \App\Jobs\DeliverPushNotification::dispatch($notification->id)->afterCommit();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    public function markAsRead(): void
    {
        $this->update(['read' => true, 'read_at' => now()]);
    }

    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
