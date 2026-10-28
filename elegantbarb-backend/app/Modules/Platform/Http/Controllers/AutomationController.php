<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Platform\Services\AutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    public function __construct(private AutomationService $service) {}

    public function autoAssignOnDemand(int $requestId): JsonResponse
    {
        $response = $this->service->autoAssignOnDemand($requestId);
        return $response->toJsonResponse();
    }

    public function autoAcceptAppointment(int $appointmentId): JsonResponse
    {
        $response = $this->service->autoAcceptAppointment($appointmentId);
        return $response->toJsonResponse();
    }

    public function dynamicPrice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'service_id' => 'required|integer|exists:pgsql.catalog.services,id',
            'date' => 'nullable|date',
            'time' => 'nullable|date_format:H:i',
        ]);

        $response = $this->service->calculateDynamicPrice(
            (int) $data['service_id'],
            $data['date'] ?? null,
            $data['time'] ?? null
        );
        return $response->toJsonResponse();
    }
}
