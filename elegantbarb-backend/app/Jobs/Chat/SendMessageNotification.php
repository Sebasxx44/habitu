<?php

namespace App\Jobs\Chat;

use App\Modules\Chat\Models\Conversation;
use App\Modules\Chat\Models\Message;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendMessageNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $messageId) {}

    public function handle(NotificationService $notifications): void
    {
        $message = Message::with(['sender', 'conversation.participants.user'])->find($this->messageId);
        if (! $message) return;

        $participants = $message->conversation->participants
            ->where('user_id', '!=', $message->sender_id);

        foreach ($participants as $participant) {
            // Only notify if message is unread by this participant
            $lastRead = $participant->last_read_at;
            if ($lastRead && $lastRead->gte($message->created_at)) continue;

            $notifications->sendToUser(
                $participant->user_id,
                'CHAT_MESSAGE',
                'Nuevo mensaje',
                "{$message->sender->name}: " . substr($message->content, 0, 100),
                [
                    'conversation_id' => $message->conversation_id,
                    'message_id' => $message->id,
                    'sender_name' => $message->sender->name,
                ]
            );
        }
    }
}
