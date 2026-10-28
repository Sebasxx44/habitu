<?php

namespace App\Modules\People\Repositories;

use App\Modules\People\Models\Professional;
use App\Repositories\BaseRepository;

class ProfessionalRepository extends BaseRepository
{
    public function __construct(Professional $model)
    {
        parent::__construct($model);
    }

    public function getByBusiness(int $businessId)
    {
        return $this->model->where('business_id', $businessId)
            ->where('is_active', true)
            ->get();
    }

    public function getByBranch(int $branchId)
    {
        return $this->model->whereHas('availability', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where('is_active', true)->get();
    }

    public function getWithAppointments(int $professionalId, string $date)
    {
        return $this->model->with(['appointments' => function ($q) use ($date) {
            $q->where('date', $date)
              ->whereIn('status', ['PENDING', 'CONFIRMED']);
        }])->find($professionalId);
    }
}
