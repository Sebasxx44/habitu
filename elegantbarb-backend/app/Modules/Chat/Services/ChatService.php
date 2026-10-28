<?php

namespace App\Modules\Chat\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Chat\Models\Conversation;
use App\Modules\Chat\Models\ConversationParticipant;
use App\Modules\Chat\Models\Message;
use App\Modules\Chat\Repositories\ConversationRepository;
use Illuminate\Support\Facades\DB;

class ChatService
{
    public function __construct(
        private ConversationRepository $conversationRepository,
        private ReservationConversationService $reservationConversations
    ) {}

    public function getConversations(int $userId): ServiceResponse
    {
        $conversations = $this->conversationRepository->getForUser($userId)->filter(function (Conversation $conversation) use ($userId) {
            $reservation = $conversation->appointment_id ? $conversation->appointment : $conversation->onDemandRequest;
            if (! $conversation->appointment_id && ! $conversation->on_demand_request_id) return true;
            return $reservation && app(\App\Modules\Booking\Services\ReservationContextService::class)
                ->canAccess($reservation, \App\Models\User::findOrFail($userId));
        })->values();

        $conversations->each(function (Conversation $conversation) use ($userId) {
            $participant = $conversation->participants->firstWhere('user_id', $userId);
            $lastReadAt = $participant?->last_read_at;

            $unreadCount = $conversation->messages()
                ->when($lastReadAt, fn ($q) => $q->where('created_at', '>', $lastReadAt))
                ->when(! $lastReadAt, fn ($q) => $q->whereNotNull('created_at'))
                ->where('sender_id', '!=', $userId)
                ->count();

            $conversation->setAttribute('unread_count', $unreadCount);
        });

        return ServiceResponse::success($conversations, 'Conversaciones obtenidas');
    }

    public function getMessages(int $conversationId, int $userId, int $limit = 50): ServiceResponse
    {
        $conversation = $this->conversationRepository->find($conversationId);

        if (! $conversation) {
            return ServiceResponse::notFound('Conversación');
        }

        $this->reservationConversations->authorize($conversation, $userId);

        $isParticipant = $conversation->participants()
            ->where('user_id', $userId)
            ->exists();

        if (! $isParticipant) {
            return ServiceResponse::forbidden('No eres participante de esta conversación');
        }

        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->where('created_at', '>=', now()->subDays(90))
            ->orderByDesc('created_at')
            ->limit(max(1, min(100, $limit)))
            ->get()
            ->reverse()
            ->values();

        // Mark messages as read for this user
        $conversation->messages()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $participant = $conversation->participants()->where('user_id', $userId)->first();
        if ($participant) {
            $participant->update(['last_read_at' => now()]);
        }

        return ServiceResponse::success($messages, 'Mensajes obtenidos');
    }

    public function sendMessage(int $conversationId, int $senderId, string $content, array $meta = []): ServiceResponse
    {
        $conversation = $this->conversationRepository->find($conversationId);

        if (! $conversation) {
            return ServiceResponse::notFound('Conversación');
        }

        $this->reservationConversations->authorize($conversation, $senderId);
        abort_unless($conversation->is_active, 422, 'La conversación está cerrada.');
        foreach ($meta['attachments'] ?? [] as $attachmentId) {
            abort_unless(DB::table('chat.attachments')->where('id', $attachmentId)->where('conversation_id', $conversationId)
                ->where('uploaded_by', $senderId)->where('created_at', '>=', now()->subDays(90))->exists(), 422);
        }

        $isParticipant = $conversation->participants()
            ->where('user_id', $senderId)
            ->exists();

        if (! $isParticipant) {
            return ServiceResponse::forbidden('No eres participante de esta conversación');
        }

        return DB::transaction(function () use ($conversation, $senderId, $content, $meta) {
            $message = $conversation->messages()->create([
                'sender_id' => $senderId,
                'content' => $content,
                'message_type' => $meta['message_type'] ?? 'TEXT',
                'attachments' => $meta['attachments'] ?? null,
            ]);

            $conversation->update(['last_message_at' => now()]);

            $message->load('sender:id,name');
            event(new \App\Modules\Chat\Events\MessageSent($message));

            return ServiceResponse::success(
                $message,
                'Mensaje enviado',
                201
            );
        });
    }

    public function createConversation(array $data, array $participantIds): ServiceResponse
    {
        if (! empty($data['appointment_id']) || ! empty($data['on_demand_request_id'])) {
            return ServiceResponse::error('Abre la conversación desde la reserva para asignar participantes autorizados.', null, 422);
        }
        if (count($participantIds) < 2) {
            return ServiceResponse::error('Se requieren al menos 2 participantes');
        }

        return DB::transaction(function () use ($data, $participantIds) {
            $conversation = $this->conversationRepository->create([
                'type' => $data['type'] ?? 'GROUP',
                'subject' => $data['subject'] ?? null,
                'business_id' => $data['business_id'] ?? null,
                'appointment_id' => $data['appointment_id'] ?? null,
                'on_demand_request_id' => $data['on_demand_request_id'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            $participants = collect($participantIds)->map(fn ($id) => ['user_id' => $id])->all();
            $conversation->participants()->createMany($participants);

            return ServiceResponse::success(
                $conversation->load('participants.user'),
                'Conversación creada',
                201
            );
        });
    }

    public function getOrCreateDirect(int $userA, int $userB): ServiceResponse
    {
        $conversation = $this->conversationRepository->getOrCreateDirect($userA, $userB);

        return ServiceResponse::success(
            $conversation->load(['participants.user', 'messages' => fn ($q) => $q->latest()->limit(1), 'messages.sender']),
            'Conversación obtenida'
        );
    }

    public function getUnreadCount(int $userId): ServiceResponse
    {
        $participantIds = ConversationParticipant::where('user_id', $userId)
            ->pluck('conversation_id');

        $unreadCount = Message::whereIn('conversation_id', $participantIds)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();

        return ServiceResponse::success(['unread_count' => $unreadCount], 'Conteo de no leídos obtenido');
    }
}
