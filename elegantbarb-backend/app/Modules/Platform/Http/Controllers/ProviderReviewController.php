<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Platform\Services\ProviderReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ProviderReviewController extends Controller
{
    public function __construct(private ProviderReviewService $service) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => 'nullable|string|max:100']);
        return ServiceResponse::success($this->service->subjects($request->user(), $data['q'] ?? ''))->toJsonResponse();
    }

    public function show(Request $request, string $kind, int $id): JsonResponse
    {
        return ServiceResponse::success($this->service->inspect($this->service->subject($kind, $id, $request->user())))->toJsonResponse();
    }

    public function store(Request $request, string $kind, int $id): JsonResponse
    {
        $subject = $this->service->subject($kind, $id, $request->user());
        $data = $request->validate(['code' => 'required|string|max:60']);
        $check = $this->service->submit($subject, $request->user(), $data['code']);
        return ServiceResponse::success(['id' => $check], 'Revisión iniciada', 201)->toJsonResponse();
    }

    public function upload(Request $request, string $kind, int $id, int $checkId): JsonResponse
    {
        $subject = $this->service->subject($kind, $id, $request->user());
        $data = $request->validate(['file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120']);
        $this->service->upload($subject, $request->user(), $checkId, $data['file']);
        return ServiceResponse::success(null, 'Documento privado recibido', 201)->toJsonResponse();
    }

    public function download(Request $request, string $kind, int $id, int $checkId, int $documentId): StreamedResponse
    {
        $subject = $this->service->subject($kind, $id, $request->user());
        $document = $this->service->document($subject, $checkId, $documentId);
        return Storage::disk('local')->download($document->path, $document->name, [
            'Content-Type' => $document->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store',
        ]);
    }

    public function decision(Request $request, string $kind, int $id, int $checkId): JsonResponse
    {
        $subject = $this->service->subject($kind, $id, $request->user());
        $data = $request->validate(['state' => 'required|in:APPROVED,REJECTED,REVOKED', 'reason' => 'required|string|min:10|max:2000',
            'expires_at' => 'nullable|date', 'evidence_reviewed' => 'exclude_unless:state,APPROVED|required|accepted']);
        $this->service->decide($subject, $request->user(), $checkId, $data);
        return ServiceResponse::success(null, 'Decisión registrada')->toJsonResponse();
    }

    public function publicSummary(string $kind, int $id): JsonResponse
    {
        return ServiceResponse::success(['checks' => $this->service->publicSummary($kind, $id), 'quality_or_safety_guarantee' => false])->toJsonResponse();
    }
}
