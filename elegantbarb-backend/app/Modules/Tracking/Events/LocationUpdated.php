<?php

namespace App\Modules\Tracking\Events;

use App\Modules\Tracking\Models\LocationUpdate;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public LocationUpdate $location) {}

    public function broadcastOn(): array
    {
        $requests = \App\Modules\OnDemand\Models\OnDemandRequest::with('client:id,user_id')
            ->where('professional_id', $this->location->professional_id)
            ->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'])->get();
        $ids = $requests->pluck('client.user_id')->push($this->location->user_id)->filter()->unique();
        return $ids->map(fn ($id) => new PrivateChannel('user.'.$id))->all();
    }

    public function broadcastAs(): string
    {
        return 'location.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'professional_id' => $this->location->professional_id,
            'lat' => $this->location->lat,
            'lng' => $this->location->lng,
            'accuracy' => $this->location->accuracy,
            'speed' => $this->location->speed,
            'heading' => $this->location->heading,
            'recorded_at' => $this->location->recorded_at->toIso8601String(),
        ];
    }
}
