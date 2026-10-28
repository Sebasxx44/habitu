<?php

namespace App\Modules\Chat\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Chat\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        private ChatService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $response = $this->service->getConversations($request->user()->id);
        return $response->toJsonResponse();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $limit = (int) $request->input('limit', 50);
        $response = $this->service->getMessages($id, $request->user()->id, $limit);
        return $response->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->filled('appointment_id') !== $request->filled('on_demand_request_id'), 422,
            'Abre una conversación vinculada a una reserva.');
        $kind = $request->filled('appointment_id') ? 'appointment' : 'on-demand';
        $id = (int) $request->input($kind === 'appointment' ? 'appointment_id' : 'on_demand_request_id');
        return app(\App\Modules\Chat\Services\ReservationConversationService::class)
            ->open($kind, $id, $request->user())->toJsonResponse();
    }

    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|string|max:4000',
            'message_type' => 'nullable|string|in:TEXT,IMAGE,FILE',
            'attachments' => 'nullable|array|max:3',
            'attachments.*' => 'integer|distinct',
        ]);

        $meta = [
            'message_type' => $data['message_type'] ?? 'TEXT',
            'attachments' => $data['attachments'] ?? null,
        ];

        $response = $this->service->sendMessage($id, $request->user()->id, $data['content'], $meta);
        return $response->toJsonResponse();
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $response = $this->service->getUnreadCount($request->user()->id);
        return $response->toJsonResponse();
    }
}
