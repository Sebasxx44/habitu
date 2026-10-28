<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Finance\Services\SplitPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SplitPaymentController extends Controller
{
    public function __construct(private SplitPaymentService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'appointment_id' => 'required|integer|exists:pgsql.booking.appointments,id',
            'total_amount' => 'required|numeric|min:1',
            'participants' => 'required|array|min:2',
            'participants.*' => 'integer|exists:pgsql.public.users,id',
        ]);

        $res = $this->service->create($data['appointment_id'], $data['total_amount'], $data['participants']);

        return $res->toJsonResponse();
    }

    public function markPaid(Request $request, int $id): JsonResponse
    {
        $res = $this->service->markPaid($id, $request->user()->id);

        return $res->toJsonResponse();
    }

    public function byAppointment(int $appointmentId): JsonResponse
    {
        $res = $this->service->getByAppointment($appointmentId);

        return $res->toJsonResponse();
    }

    public function mySplits(Request $request): JsonResponse
    {
        $res = $this->service->getByUser($request->user()->id);

        return $res->toJsonResponse();
    }
}
