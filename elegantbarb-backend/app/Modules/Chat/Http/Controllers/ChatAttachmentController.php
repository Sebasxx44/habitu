<?php

namespace App\Modules\Chat\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Chat\Models\Conversation;
use App\Modules\Chat\Services\ReservationConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatAttachmentController extends Controller
{
    public function __construct(private ReservationConversationService $access) {}

    public function store(Request $request, int $id): JsonResponse
    {
        $conversation = Conversation::findOrFail($id);
        $this->access->authorize($conversation, $request->user()->id);
        abort_unless($conversation->is_active, 422);
        $data = $request->validate(['file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $file = $data['file'];
        $path = $file->store('reservation-chat', 'local');
        $attachment = DB::table('chat.attachments')->insertGetId(['conversation_id' => $id,
            'uploaded_by' => $request->user()->id, 'path' => $path, 'name' => basename($file->getClientOriginalName()),
            'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'created_at' => now(), 'updated_at' => now()]);
        return ServiceResponse::success(['id' => $attachment, 'name' => basename($file->getClientOriginalName())], 'Archivo adjunto', 201)->toJsonResponse();
    }

    public function download(Request $request, int $id, int $attachmentId): StreamedResponse
    {
        $this->access->authorize(Conversation::findOrFail($id), $request->user()->id);
        $attachment = DB::table('chat.attachments')->where('conversation_id', $id)->where('id', $attachmentId)
            ->where('created_at', '>=', now()->subDays(90))->first();
        abort_unless($attachment && Storage::disk('local')->exists($attachment->path), 404);
        return Storage::disk('local')->download($attachment->path, $attachment->name,
            ['Content-Type' => $attachment->mime_type, 'X-Content-Type-Options' => 'nosniff']);
    }
}
