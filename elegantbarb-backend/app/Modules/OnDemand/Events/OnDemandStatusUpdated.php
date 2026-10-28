<?php

namespace App\Modules\OnDemand\Events;

use App\Modules\OnDemand\Models\OnDemandRequest;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OnDemandStatusUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public OnDemandRequest $request,
        public string $oldStatus,
        public string $newStatus
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('on-demand.' . $this->request->id),
            new PrivateChannel('client.' . $this->request->client_id),
            $this->request->professional_id
                ? new PrivateChannel('professional.' . $this->request->professional_id)
                : new PrivateChannel('on-demand.searching.' . $this->request->business_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'request_id' => $this->request->id,
            'request_code' => $this->request->request_code,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'professional' => $this->request->professional ? [
                'id' => $this->request->professional->id,
                'name' => $this->request->professional->name,
                'lat' => $this->request->professional_lat,
                'lng' => $this->request->professional_lng,
            ] : null,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
