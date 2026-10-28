<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Finance\Services\BNPLService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BNPLController extends Controller
{
    public function __construct(private BNPLService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|integer|exists:pgsql.people.clients,id',
            'appointment_id' => 'required|integer|exists:pgsql.booking.appointments,id',
            'total_amount' => 'required|numeric|min:1',
            'installments_count' => 'nullable|integer|in:3,6,12',
            'interest_rate' => 'nullable|numeric|min:0',
            'provider' => 'nullable|string',
        ]);

        $res = $this->service->apply($data);

        return $res->toJsonResponse();
    }

    public function approve(int $id): JsonResponse
    {
        $res = $this->service->approve($id);

        return $res->toJsonResponse();
    }

    public function reject(int $id): JsonResponse
    {
        $res = $this->service->reject($id);

        return $res->toJsonResponse();
    }

    public function payInstallment(int $id): JsonResponse
    {
        $res = $this->service->payInstallment($id);

        return $res->toJsonResponse();
    }

    public function byClient(Request $request): JsonResponse
    {
        $clientId = $request->input('client_id');
        $res = $this->service->getByClient($clientId);

        return $res->toJsonResponse();
    }

    public function byAppointment(int $appointmentId): JsonResponse
    {
        $res = $this->service->getByAppointment($appointmentId);

        return $res->toJsonResponse();
    }
}
