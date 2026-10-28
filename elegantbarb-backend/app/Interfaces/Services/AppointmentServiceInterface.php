<?php

namespace App\Interfaces\Services;

interface AppointmentServiceInterface
{
    public function getAppointments($shopId = null);
    public function getAppointmentStats($shopId);
    public function createAppointment(array $data);
    public function getAppointmentById($id);
    public function updateAppointment($id, array $data);
    public function rescheduleAppointment($id, array $data);
    public function cancelAppointment($id, array $data);
    public function deleteAppointment($id);
}
