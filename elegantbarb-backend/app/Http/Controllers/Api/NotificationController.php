<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Interfaces\Services\NotificationServiceInterface;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected $service;

    public function __construct(NotificationServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $response = $this->service->getInbox($request->user()->id);
        return response()->json($response);
    }

    public function markAsRead(Request $request, string $notification)
    {
        $this->service->markAsRead($notification, $request->user()->id);
        return response()->json(['message' => 'Marcada como leída']);
    }

    public function markAllRead(Request $request)
    {
        $this->service->markAllRead($request->user()->id);
        return response()->json(['message' => 'Todas marcadas como leídas']);
    }

    public function send(Request $request)
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:200',
            'message' => 'required|string',
            'type' => 'required|in:info,success,warning,danger',
        ]);

        $notification = $this->service->sendNotification($data);
        return response()->json($notification, 201);
    }

    public function broadcastToRole(Request $request)
    {
        $data = $request->validate([
            'role' => 'required|in:SUPERADMIN,ADMIN_BARBERIA,PROFESSIONAL,CLIENTE',
            'title' => 'required|string|max:200',
            'message' => 'required|string',
            'type' => 'required|in:info,success,warning,danger',
        ]);

        $count = $this->service->broadcastToRole($data);
        return response()->json(['message' => "Notificaciones enviadas a {$count} usuarios"]);
    }
}
