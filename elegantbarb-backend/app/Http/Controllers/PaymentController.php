<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\PaymentServiceInterface;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected $service;

    public function __construct(PaymentServiceInterface $service)
    {
        $this->service = $service;
    }

    public function createPreference(Request $request)
    {
        $request->validate([
            'appointment_id' => 'required|exists:pgsql.booking.appointments,id',
        ]);

        $result = $this->service->createPreference($request->appointment_id);
        
        return response()->json($result);
    }

    public function webhook(Request $request)
    {
        $result = $this->service->handleWebhook($request->all());

        return response()->json($result);
    }

    public function markPaid(Request $request)
    {
        $request->validate([
            'appointment_id' => 'required|exists:pgsql.booking.appointments,id',
        ]);

        $appointment = $this->service->markPaid($request->appointment_id);

        return response()->json(['message' => 'Pago registrado', 'appointment' => $appointment]);
    }
}