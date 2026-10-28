<?php

namespace App\Modules\Platform\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Platform\Models\AIConversation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AIChatbotService
{
    public function startConversation(int $userId, string $contextType = 'GENERAL', array $contextData = []): ServiceResponse
    {
        $actor = \App\Models\User::findOrFail($userId);
        $contextData['actor_role'] = $actor->role;
        unset($contextData['lat'], $contextData['lng']);
        if ($actor->role !== \App\Models\User::ROLE_CLIENT) $contextType = 'OPERATIONS';
        $conversation = DB::transaction(function () use ($userId, $contextType, $contextData) {
            $conversation = AIConversation::create(['user_id' => $userId, 'session_id' => Str::uuid()->toString(),
                'context_type' => $contextType, 'context_data' => $contextData, 'status' => 'ACTIVE', 'last_activity_at' => now()]);
            $conversation->messages()->create(['role' => 'assistant',
                'content' => $contextType === 'OPERATIONS'
                    ? (($contextData['locale'] ?? 'es') === 'en' ? 'I can summarize your authorized schedule and prepare changes for review. No booking is changed automatically.' : 'Puedo resumir tu agenda autorizada y preparar cambios para revisión. Ninguna reserva se modifica automáticamente.')
                    : (($contextData['locale'] ?? 'es') === 'en'
                    ? 'Tell me what you want to book, when and where. I will check real services, prices and availability; you will confirm before any booking is created.'
                    : 'Dime qué servicio buscas, cuándo y en qué zona. Consultaré servicios, precios y horarios del catálogo; confirmarás cualquier reserva antes de crearla.'),
                'metadata' => ['source' => $contextType === 'OPERATIONS' ? 'operations' : 'catalog', 'cards' => [], 'requires_confirmation' => true]]);
            return $conversation;
        });
        return ServiceResponse::success($conversation->load('messages'), ($contextData['locale'] ?? 'es') === 'en' ? 'Conversation started' : 'Conversación iniciada', 201);
    }

    public function sendMessage(int $userId, string $sessionId, string $content, ?string $imageBase64 = null, array $context = []): ServiceResponse
    {
        $conversation = $this->scoped($userId)->where('session_id', $sessionId)->first();
        if (! $conversation) return ServiceResponse::notFound('Conversación');
        $actor = \App\Models\User::findOrFail($userId);
        if (($conversation->context_data['actor_role'] ?? \App\Models\User::ROLE_CLIENT) !== $actor->role || $conversation->last_activity_at->lt(now()->subDays(90))) return ServiceResponse::notFound('Conversación');
        if ($conversation->status !== 'ACTIVE') return ServiceResponse::error('La conversación está cerrada.', null, 409);
        if ($conversation->messages()->count() >= 200) return ServiceResponse::error('Inicia una nueva conversación para continuar.', null, 422);
        if ($actor->role !== \App\Models\User::ROLE_CLIENT) return $this->operationalReply($conversation, $actor, $content, $context);
        $history = $conversation->messages()->reorder('id', 'desc')->limit(6)->get(['role', 'content'])->reverse()->values()->toArray();
        $intent = app(BookingAssistantIntent::class)->resolve($content, $imageBase64, $history, $conversation->context_data ?? [], $context);
        $english = ($intent['filters']['locale'] ?? 'es') === 'en';
        $clarification = $intent['clarification_required'];
        $clarifyingQuestion = match ($intent['clarification_field']) {
            'earlier' => $english ? 'Before what time would you like to book? I will keep the same service and date.' : '¿Antes de qué hora quieres reservar? Mantengo el mismo servicio y fecha.',
            'later' => $english ? 'After what time would you like to book? I will keep the same service and date.' : '¿Después de qué hora quieres reservar? Mantengo el mismo servicio y fecha.',
            default => $english ? 'Which service or business do you want to book? Tell me so I can check the right catalogue.' : '¿Qué servicio o negocio quieres reservar? Dímelo para consultar el catálogo correcto.',
        };
        $result = $clarification
            ? ['cards' => [], 'filters' => $intent['filters'], 'explanation' => $clarifyingQuestion]
            : app(BookingAssistantTools::class)->execute($userId, $intent['intent'], $intent['filters']);
        $text = $result['explanation'] ?? ($result['cards'] === []
            ? ($english ? 'No options matched those filters. Try another date, area or service.' : 'No encontré opciones con esos filtros. Prueba otra fecha, zona o servicio.')
            : ($intent['intent'] === 'my_appointments'
                ? ($english ? 'These are your bookings. Open one to check its current status.' : 'Estas son tus reservas registradas. Abre el detalle para consultar su estado.')
                : ($english ? 'These options come from the current catalogue and schedule. Choose one to review the final price and confirm your booking.' : 'Estas opciones provienen del catálogo y la agenda actuales. Elige una para revisar el precio final y confirmar tu reserva.')));
        if ($intent['source'] === 'catalog') $text = ($english ? 'Catalogue mode: searching by filters without AI interpretation. ' : 'Modo catálogo: búsqueda por filtros, sin interpretación de IA disponible. ').$text;
        if ($intent['location_required']) $text .= $english ? ' Share your location or enter an area to sort by distance.' : ' Comparte tu ubicación o escribe una zona para ordenar por cercanía.';
        if ($intent['image_unavailable']) $text .= $english ? ' I did not analyse the image; describe the service in text.' : ' No analicé la imagen; describe por texto el servicio que necesitas.';
        return DB::transaction(function () use ($conversation, $content, $text, $intent, $result, $clarification) {
            $current = AIConversation::lockForUpdate()->find($conversation->id);
            if ($current->status !== 'ACTIVE') return ServiceResponse::error('La conversación está cerrada.', null, 409);
            $current->messages()->create(['role' => 'user', 'content' => app(AssistantPrivacyService::class)->redact($content)]);
            $message = $current->messages()->create(['role' => 'assistant', 'content' => $text,
                'metadata' => ['source' => $intent['source'], 'intent' => $intent['intent'], 'cards' => $result['cards'],
                    'requires_confirmation' => true, 'location_required' => $intent['location_required'], 'clarification_required' => $clarification,
                    'search_context' => array_intersect_key($result['filters'], array_flip(['q', 'date', 'date_to', 'time_from', 'time_to', 'zone']))],
                'tool_calls' => $clarification ? [] : [['name' => $intent['intent'] === 'my_appointments' ? 'getUserAppointments' : 'searchCatalogAndAvailability', 'read_only' => true]]]);
            $persisted = array_diff_key($result['filters'], ['lat' => true, 'lng' => true]);
            $persisted['actor_role'] = $conversation->context_data['actor_role'] ?? \App\Models\User::ROLE_CLIENT;
            $current->update(['last_activity_at' => now(), 'context_data' => $persisted]);
            return ServiceResponse::success($message, 'Consulta completada');
        });
    }

    private function scoped(int $userId): \Illuminate\Database\Eloquent\Builder
    {
        $role = \App\Models\User::findOrFail($userId)->role;
        return AIConversation::forUser($userId)->where('last_activity_at', '>=', now()->subDays(90))
            ->where(fn ($query) => $query->where('context_data->actor_role', $role)
                ->when($role === \App\Models\User::ROLE_CLIENT, fn ($q) => $q->orWhereNull('context_data->actor_role')));
    }

    private function operationalReply(AIConversation $conversation, \App\Models\User $actor, string $content, array $context): ServiceResponse
    {
        $filters = array_replace($conversation->context_data ?? [], $context);
        $result = app(OperationalAssistantTools::class)->execute($actor, $content, $filters);
        return DB::transaction(function () use ($conversation, $actor, $content, $result) {
            $current = AIConversation::lockForUpdate()->findOrFail($conversation->id);
            abort_unless($current->status === 'ACTIVE', 409);
            $current->messages()->create(['role' => 'user', 'content' => app(AssistantPrivacyService::class)->redact($content)]);
            $message = $current->messages()->create(['role' => 'assistant', 'content' => $result['explanation'],
                'metadata' => ['source' => 'operations', 'intent' => $result['intent'], 'cards' => $result['cards'], 'summary' => $result['summary'],
                    'requires_confirmation' => true, 'retention_days' => 90],
                'tool_calls' => [['name' => 'getAuthorizedSchedule', 'read_only' => true]]]);
            $current->update(['last_activity_at' => now(), 'context_data' => $result['filters'] + ['actor_role' => $actor->role]]);
            return ServiceResponse::success($message, 'Agenda consultada; ninguna reserva fue modificada');
        });
    }

    public function deleteConversation(int $userId, string $sessionId): ServiceResponse
    {
        $conversation = $this->scoped($userId)->where('session_id', $sessionId)->firstOrFail();
        $conversation->delete();
        return ServiceResponse::success(null, 'Conversación eliminada');
    }

    public function getConversation(int $userId, string $sessionId): ServiceResponse
    {
        $conversation = $this->scoped($userId)->where('session_id', $sessionId)->with('messages')->first();
        return $conversation ? ServiceResponse::success($conversation, 'Conversación obtenida') : ServiceResponse::notFound('Conversación');
    }

    public function getHistory(int $userId, int $limit = 20): ServiceResponse
    {
        return ServiceResponse::success($this->scoped($userId)->orderByDesc('last_activity_at')->limit(min(50, max(1, $limit)))
            ->get(['id', 'session_id', 'context_type', 'status', 'last_activity_at', 'created_at']), 'Historial obtenido');
    }

    public function closeConversation(int $userId, string $sessionId): ServiceResponse
    {
        $conversation = $this->scoped($userId)->where('session_id', $sessionId)->first();
        if (! $conversation) return ServiceResponse::notFound('Conversación');
        $conversation->update(['status' => 'CLOSED']);
        return ServiceResponse::success($conversation, 'Conversación cerrada');
    }
}
