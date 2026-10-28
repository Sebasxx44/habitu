<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\AppointmentServiceInterface;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    protected $service;

    public function __construct(AppointmentServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        $query = \App\Modules\Booking\Models\Appointment::with(['professional', 'service', 'client']);

        if ($user->role === 'CLIENTE' && $user->cliente_id) {
            $query->where('client_id', $user->cliente_id);
        } elseif ($user->role === 'PROFESSIONAL' && $user->barber_id) {
            $query->where('professional_id', $user->barber_id);
        } elseif ($request->barber_shop_id) {
            $query->where('business_id', $request->barber_shop_id);
        }

        $appointments = $query->orderBy('date', 'desc')->orderBy('time', 'desc')->get();
        return response()->json($appointments);
    }

    public function stats(Request $request)
    {
        $stats = $this->service->getAppointmentStats($request->barber_shop_id);
        return response()->json($stats);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'time' => 'required',
            'status' => 'nullable|string',
            'price' => 'nullable|numeric',
            'paid' => 'nullable|boolean',
            'client_id' => 'required|exists:pgsql.people.clients,id',
            'barber_id' => 'required|exists:pgsql.people.professionals,id',
            'service_id' => 'required|exists:pgsql.catalog.services,id',
            'barber_shop_id' => 'required|exists:pgsql.business.businesses,id'
        ]);
        return response()->json($this->service->createAppointment($data), 201);
    }

    public function show($id)
    {
        return response()->json($this->service->getAppointmentById($id));
    }

    public function update(Request $request, $id)
    {
        $appointment = $this->service->updateAppointment($id, $request->all());
        return response()->json($appointment);
    }

    public function reschedule(Request $request, $id)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'time' => 'required',
            'barber_id' => 'required|exists:pgsql.people.professionals,id'
        ]);

        $appointment = $this->service->rescheduleAppointment($id, $data);
        return response()->json($appointment);
    }

    public function cancel(Request $request, $id)
    {
        $data = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $appointment = $this->service->cancelAppointment($id, $data);
        return response()->json($appointment);
    }

    public function destroy($id)
    {
        $this->service->deleteAppointment($id);
        return response()->json(null, 204);
    }
}
