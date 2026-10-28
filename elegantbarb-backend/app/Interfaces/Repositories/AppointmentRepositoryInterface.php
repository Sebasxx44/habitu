<?php

namespace App\Interfaces\Repositories;

interface AppointmentRepositoryInterface extends BaseRepositoryInterface
{
    public function getAppointmentsWithRelations($shopId = null);
    public function getAppointmentStats($shopId);
}
