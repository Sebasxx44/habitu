<?php

namespace App\Modules\Realtime\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Support\Str;

final class ResourceChanged implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    public string $queue = 'realtime';
    public int $tries = 3;
    public int $timeout = 15;
    public string $revision;
    public string $occurredAt;

    public function __construct(public array $topics, public array $channels)
    {
        $this->revision = (string) Str::uuid();
        $this->occurredAt = now()->toIso8601String();
    }

    public function broadcastOn(): array
    {
        return array_map(fn (string $name) => $name === 'marketplace' || str_starts_with($name, 'availability.')
            ? new Channel($name) : new PrivateChannel($name), $this->channels);
    }

    public function broadcastAs(): string
    {
        return 'resource.changed';
    }

    public function broadcastWith(): array
    {
        return ['topics' => $this->topics, 'revision' => $this->revision, 'occurred_at' => $this->occurredAt];
    }
}
