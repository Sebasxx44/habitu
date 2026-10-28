<?php

namespace App\Modules\OnDemand\Repositories;

use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Repositories\BaseRepository;
use Illuminate\Support\Facades\DB;

class OnDemandRequestRepository extends BaseRepository
{
    public function __construct(OnDemandRequest $model)
    {
        parent::__construct($model);
    }

    public function findActiveByClient(int $clientId)
    {
        return $this->model->where('client_id', $clientId)
            ->active()
            ->with(['assignments.professional', 'professional', 'service', 'statusHistory'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function findActiveByProfessional(int $professionalId)
    {
        return $this->model->where('professional_id', $professionalId)
            ->active()
            ->with(['assignments.professional', 'client', 'service', 'statusHistory'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function getNearbyProfessionals(float $lat, float $lng, float $radiusKm, ?int $businessId = null)
    {
        $haversine = "(
            6371 * acos(
                cos(radians(?)) * cos(radians(loc.lat))
                * cos(radians(loc.lng) - radians(?))
                + sin(radians(?)) * sin(radians(loc.lat))
            )
        )";

        $sql = "
            SELECT
                p.id, p.business_id, p.name, p.photo_url, p.specialty,
                u.name as user_name,
                round(loc.lat::numeric, 3) as lat,
                round(loc.lng::numeric, 3) as lng,
                {$haversine} as distance
            FROM people.professionals p
            JOIN public.users u ON p.user_id = u.id
            JOIN (
                SELECT DISTINCT ON (professional_id)
                    professional_id, lat, lng
                FROM tracking.location_updates
                WHERE professional_id IS NOT NULL AND recorded_at >= NOW() - INTERVAL '5 minutes'
                ORDER BY professional_id, recorded_at DESC
            ) loc ON loc.professional_id = p.id
            WHERE p.is_active = true AND p.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM on_demand.professional_presence presence WHERE presence.professional_id = p.id AND presence.is_paused = true)
            AND NOT EXISTS (SELECT 1 FROM on_demand.requests active WHERE active.professional_id = p.id AND active.deleted_at IS NULL AND active.status IN ('ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'))
            AND {$haversine} <= ?
        ";

        $bindings = [$lat, $lng, $lat, $lat, $lng, $lat, $radiusKm];

        if ($businessId) {
            $sql .= " AND p.business_id = ?";
            $bindings[] = $businessId;
        }

        $sql .= " ORDER BY distance";

        return DB::select($sql, $bindings);
    }
}
