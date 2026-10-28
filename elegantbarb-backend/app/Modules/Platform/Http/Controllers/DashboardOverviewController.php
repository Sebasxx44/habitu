<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Platform\Services\DashboardOverviewService;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardOverviewController extends Controller
{
    public function __invoke(Request $request, DashboardOverviewService $service): JsonResponse
    {
        $period = AnalyticsPeriod::fromRequest($request);

        return response()->json($service->overview($request->user(), $period, $request->input('currency')))
            ->header('Cache-Control', 'private, no-store');
    }
}
