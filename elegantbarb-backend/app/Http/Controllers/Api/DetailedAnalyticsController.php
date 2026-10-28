<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Interfaces\Services\ReportServiceInterface;
use Illuminate\Http\Request;

class DetailedAnalyticsController extends Controller
{
    protected $service;

    public function __construct(ReportServiceInterface $service)
    {
        $this->service = $service;
    }

    public function superadminOverview(Request $request)
    {
        $days = $request->get('days', 30);
        $data = $this->service->getSuperadminOverview($days);
        return response()->json($data);
    }

    public function adminShopPerformance(Request $request)
    {
        try {
            $data = $this->service->getAdminShopPerformance($request->user());
            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }
}
