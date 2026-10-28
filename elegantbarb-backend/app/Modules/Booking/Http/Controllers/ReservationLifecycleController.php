<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Booking\Services\ReservationCheckInService;
use App\Modules\Booking\Services\ReservationIncidentService;
use App\Modules\Chat\Services\ReservationConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationLifecycleController extends Controller
{
    public function __construct(private ReservationCheckInService $checkIn, private ReservationIncidentService $incidents,
        private ReservationConversationService $conversations) {}

    public function show(Request $request, string $kind, int $id): JsonResponse
    {
        return $this->incidents->list($kind, $id, $request->user())->toJsonResponse();
    }

    public function conversation(Request $request, string $kind, int $id): JsonResponse
    {
        return $this->conversations->open($kind, $id, $request->user())->toJsonResponse();
    }

    public function issuePin(Request $request, string $kind, int $id): JsonResponse
    {
        return $this->checkIn->issue($kind, $id, $request->user())->toJsonResponse();
    }

    public function verifyPin(Request $request, string $kind, int $id): JsonResponse
    {
        $data = $request->validate(['pin' => 'required_without:manual_reason|nullable|digits:6',
            'manual_reason' => 'nullable|string|min:10|max:1000']);
        return $this->checkIn->verify($kind, $id, $request->user(), $data['pin'] ?? null, $data['manual_reason'] ?? null)->toJsonResponse();
    }

    public function reportIncident(Request $request, string $kind, int $id): JsonResponse
    {
        $data = $request->validate(['category' => 'required|in:PROFESSIONAL_ABSENT,RESOURCE_UNAVAILABLE,PRICE_DIFFERENCE,DUPLICATE_CHARGE,SERVICE_NOT_PERFORMED',
            'description' => 'required|string|min:10|max:3000']);
        return $this->incidents->create($kind, $id, $request->user(), $data)->toJsonResponse();
    }

    public function updateIncident(Request $request, string $kind, int $id, int $caseId): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:OPEN,IN_REVIEW,RESOLVED',
            'response_due_at' => 'nullable|date|after:now', 'resolution' => 'required_if:status,RESOLVED|nullable|string|min:10|max:3000']);
        return $this->incidents->update($kind, $id, $caseId, $request->user(), $data)->toJsonResponse();
    }
}
