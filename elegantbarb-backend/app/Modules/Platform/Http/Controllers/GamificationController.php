<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Platform\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(private GamificationService $service) {}

    public function stats(Request $request): JsonResponse
    {
        $res = $this->service->getUserStats($request->user()->id);

        return $res->toJsonResponse();
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $request->validate([
            'business_id' => 'nullable|integer|exists:pgsql.business.businesses,id',
            'period' => 'sometimes|in:WEEK,MONTH,YEAR,ALL_TIME',
            'type' => 'sometimes|in:GLOBAL,CLIENTE,PROFESSIONAL',
        ]);
        $res = $this->service->getLeaderboard(
            $request->input('business_id'),
            $request->input('period', 'MONTH'),
            $request->input('type', 'GLOBAL')
        );

        return $res->toJsonResponse();
    }

    public function badges(Request $request): JsonResponse
    {
        $res = $this->service->getAvailableBadges();

        return $res->toJsonResponse();
    }
}
