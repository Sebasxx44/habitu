<?php

namespace App\Modules\Platform\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\RecommendationLog;
use Illuminate\Support\Facades\DB;

class RecommendationService implements ServiceInterface
{
    public function all(array $filters = []): ServiceResponse
    {
        return ServiceResponse::success([], 'Not implemented');
    }

    public function find(int $id): ServiceResponse
    {
        return ServiceResponse::notFound('Recommendation');
    }

    public function create(array $data): ServiceResponse
    {
        return ServiceResponse::success(null, 'Not implemented');
    }

    public function update(int $id, array $data): ServiceResponse
    {
        return ServiceResponse::notFound('Recommendation');
    }

    public function delete(int $id): ServiceResponse
    {
        return ServiceResponse::notFound('Recommendation');
    }

    public function getForUser(int $userId, ?float $lat, ?float $lng, int $limit = 10): ServiceResponse
    {
        $clientIds = Client::where('user_id', $userId)->pluck('id');

        $pastCategoryIds = Appointment::whereIn('client_id', $clientIds)
            ->join('business.businesses', 'appointments.business_id', '=', 'business.businesses.id')
            ->pluck('business.businesses.business_category_id')
            ->unique()
            ->values()
            ->toArray();

        $query = Business::query()
            ->from('business.businesses')
            ->where('business.businesses.is_active', true)
            ->with(['category', 'mainBranch'])
            ->withCount('appointments');

        if ($lat !== null && $lng !== null) {
            $query->select('business.businesses.*');
            $query->selectRaw(
                "MIN(
                    6371 * acos(
                        cos(radians(?)) * cos(radians(business_branches.lat)) *
                        cos(radians(business_branches.lng) - radians(?)) +
                        sin(radians(?)) * sin(radians(business_branches.lat))
                    )
                ) as distance",
                [$lat, $lng, $lat]
            );
            $query->join('business.business_branches', 'business.businesses.id', '=', 'business.business_branches.business_id');
            $query->where('business.business_branches.is_active', true);
            $query->whereNotNull('business.business_branches.lat');
            $query->whereNotNull('business.business_branches.lng');
            $query->groupBy('business.businesses.id');
        }

        $businesses = $query->limit(200)->get();

        $maxAppointments = $businesses->max('appointments_count') ?: 1;

        $results = $businesses->map(function (Business $business) use ($lat, $lng, $pastCategoryIds, $maxAppointments) {
            $distanceScore = 0;
            if ($lat !== null && $lng !== null && isset($business->distance)) {
                $distanceScore = max(0, 1 - ((float) $business->distance / 50));
            }

            $ratingScore = min(((float) ($business->rating ?? 0)) / 5, 1);
            $popularityScore = min($business->appointments_count / $maxAppointments, 1);
            $historyScore = in_array($business->business_category_id, $pastCategoryIds, true) ? 1 : 0;

            $score = (
                $distanceScore * 0.30 +
                $ratingScore * 0.25 +
                $popularityScore * 0.20 +
                $historyScore * 0.25
            );

            return [
                'business' => $business,
                'score' => round($score, 4),
                'factors' => [
                    'distance_score' => round($distanceScore, 4),
                    'rating_score' => round($ratingScore, 4),
                    'popularity_score' => round($popularityScore, 4),
                    'history_score' => round($historyScore, 4),
                ],
            ];
        })->sortByDesc('score')->values();

        $topResults = $results->take($limit);

        DB::transaction(function () use ($userId, $topResults) {
            foreach ($topResults as $result) {
                RecommendationLog::create([
                    'user_id' => $userId,
                    'recommendation_type' => 'BUSINESS',
                    'recommendable_type' => Business::class,
                    'recommendable_id' => $result['business']->id,
                    'score' => $result['score'],
                    'algorithm' => 'weighted_multi_factor',
                    'factors' => $result['factors'],
                ]);
            }
        });

        return ServiceResponse::success($topResults->values()->toArray(), 'Recommendations retrieved');
    }
}
