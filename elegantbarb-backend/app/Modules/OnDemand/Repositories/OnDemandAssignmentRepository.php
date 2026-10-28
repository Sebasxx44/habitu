<?php

namespace App\Modules\OnDemand\Repositories;

use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Repositories\BaseRepository;

class OnDemandAssignmentRepository extends BaseRepository
{
    public function __construct(OnDemandAssignment $model)
    {
        parent::__construct($model);
    }

    public function findByRequestAndProfessional(int $requestId, int $professionalId): ?OnDemandAssignment
    {
        return $this->model
            ->where('request_id', $requestId)
            ->where('professional_id', $professionalId)
            ->first();
    }

    public function findClosestPending(int $requestId): ?OnDemandAssignment
    {
        return $this->model
            ->where('request_id', $requestId)
            ->where('status', 'PENDING')
            ->orderBy('distance_km', 'asc')
            ->first();
    }

    public function updatePendingByRequest(int $requestId, array $data, ?int $excludeProfessionalId = null): int
    {
        $query = $this->model
            ->where('request_id', $requestId)
            ->where('status', 'PENDING');

        if ($excludeProfessionalId) {
            $query->where('professional_id', '!=', $excludeProfessionalId);
        }

        return $query->update($data);
    }
}
