<?php

namespace App\Modules\Booking\Repositories;

use App\Modules\Booking\Models\Appointment;
use App\Repositories\BaseRepository;

class AppointmentRepository extends BaseRepository
{
    public function __construct(Appointment $model)
    {
        parent::__construct($model);
    }

    public function getByBusiness(int $businessId, array $filters = [])
    {
        $query = $this->model->where('business_id', $businessId);

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['date'])) {
            $query->where('date', $filters['date']);
        }

        if (! empty($filters['professional_id'])) {
            $query->where('professional_id', $filters['professional_id']);
        }

        return $query->with(['client', 'professional', 'service'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'asc')
            ->get();
    }

    public function getUpcomingForClient(int $clientId)
    {
        return $this->model->where('client_id', $clientId)
            ->whereIn('status', ['PENDING', 'CONFIRMED'])
            ->where('date', '>=', now()->toDateString())
            ->with(['business', 'professional', 'service'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();
    }

    public function getByDateRange(int $businessId, string $start, string $end)
    {
        return $this->model->where('business_id', $businessId)
            ->whereBetween('date', [$start, $end])
            ->with(['client', 'professional', 'service'])
            ->get();
    }

    public function countByStatus(int $businessId, string $status): int
    {
        return $this->model->where('business_id', $businessId)
            ->where('status', $status)
            ->count();
    }
}
