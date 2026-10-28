<?php

namespace App\Services;

use App\Interfaces\Repositories\AppointmentRepositoryInterface;
use App\Interfaces\Services\AppointmentServiceInterface;

class AppointmentService implements AppointmentServiceInterface
{
    protected $repository;

    public function __construct(AppointmentRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getAppointments($shopId = null)
    {
        return $this->repository->getAppointmentsWithRelations($shopId);
    }

    public function getAppointmentStats($shopId)
    {
        return $this->repository->getAppointmentStats($shopId);
    }

    public function createAppointment(array $data)
    {
        $appointment = $this->repository->create($data);

        // Generate and save booking code
        $appointment->load('barberShop');
        $months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        $dateObj = \Carbon\Carbon::parse($appointment->date);
        $monthStr = $months[$dateObj->month - 1] ?? 'MES';
        $shopName = $appointment->barberShop ? $appointment->barberShop->name : 'SHO';
        $shopStr = strtoupper(substr($shopName, 0, 3));
        
        $bookingCode = "CO-{$monthStr}-{$shopStr}-{$appointment->id}";
        $this->repository->update($appointment->id, ['booking_code' => $bookingCode]);
        $appointment->booking_code = $bookingCode;

        return $appointment;
    }

    public function getAppointmentById($id)
    {
        return $this->repository->find($id)->load(['client', 'barber', 'service']);
    }

    public function updateAppointment($id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function rescheduleAppointment($id, array $data)
    {
        $oldAppointment = $this->repository->find($id);
        
        $appointment = $this->repository->update($id, $data);
        $appointment->load(['client', 'barber', 'service', 'barberShop']);

        \Illuminate\Support\Facades\DB::table('appointment_reschedules')->insert([
            'appointment_id' => $id,
            'old_date' => $oldAppointment->date,
            'old_time' => $oldAppointment->time,
            'new_date' => $appointment->date,
            'new_time' => $appointment->time,
            'reason' => $data['reason'] ?? 'Rescheduled by user',
            'rescheduled_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($appointment->client && $appointment->client->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($appointment->client->email)
                    ->send(new \App\Mail\AppointmentRescheduled($appointment));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error("Error sending reschedule email: " . $e->getMessage());
            }
        }

        return $appointment;
    }

    public function cancelAppointment($id, array $data)
    {
        $appointment = $this->repository->find($id);
        $appointment->load(['client', 'barber', 'service', 'barberShop']);

        // Update status to CANCELADA
        $this->repository->update($id, ['status' => 'CANCELADA']);

        // Log cancellation for traceability
        \Illuminate\Support\Facades\DB::table('appointment_cancellations')->insert([
            'appointment_id' => $id,
            'reason'         => $data['reason'] ?? null,
            'cancelled_by'   => auth()->id(),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        $appointment->status = 'CANCELADA';
        return $appointment;
    }

    public function deleteAppointment($id)
    {
        return $this->repository->delete($id);
    }
}
