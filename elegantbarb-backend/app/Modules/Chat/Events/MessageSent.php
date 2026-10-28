<?php

namespace App\Modules\Chat\Events;

use App\Modules\Chat\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast, \Illuminate\Contracts\Events\ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        $conversation = $this->message->conversation;
        $reservation = $conversation->appointment_id ? $conversation->appointment : $conversation->onDemandRequest;
        $context = app(\App\Modules\Booking\Services\ReservationContextService::class);
        return $conversation->participants()->with('user')->get()
            ->filter(fn ($participant) => ! $reservation || $context->canAccess($reservation, $participant->user))
            ->map(fn ($participant) => new PrivateChannel('user.'.$participant->user_id))->all();
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'conversation_id' => $this->message->conversation_id,
            'sender_id' => $this->message->sender_id,
            'content' => $this->message->content,
            'message_type' => $this->message->message_type,
            'created_at' => $this->message->created_at->toIso8601String(),
        ];
    }
}
