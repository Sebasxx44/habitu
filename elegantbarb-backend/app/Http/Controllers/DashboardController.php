<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\DashboardServiceInterface;
use Illuminate\Http\Request;
use App\Modules\Analytics\Services\AnalyticsPeriod;

class DashboardController extends Controller
{
    protected $service;

    public function __construct(DashboardServiceInterface $service)
    {
        $this->service = $service;
    }

    public function superadmin(Request $request)
    {
        $data = $this->service->getSuperadminDashboard($request->all());
        return response()->json($data);
    }

    public function adminBarberia(Request $request)
    {
        try {
            $data = $this->service->getAdminDashboard($request->user(), $request->get('shop_id'));
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }

    public function barbero(Request $request)
    {
        $request->validate(['barber_id' => 'sometimes|integer|min:1']);
        $period = AnalyticsPeriod::fromRequest($request);
        try {
            $data = $this->service->getBarberDashboard(
                $request->user(),
                $request->get('barber_id'),
                $period->start->toDateString(),
                $period->end->toDateString(),
                $request->input('currency')
            );
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }

    public function cliente(Request $request)
    {
        $data = $this->service->getClientDashboard($request->user());
        return response()->json($data);
    }

    public function shopsMap()
    {
        $data = $this->service->getShopsMap();
        return response()->json(['shops' => $data]);
    }

    public function countries()
    {
        $data = $this->service->getCountries();
        return response()->json($data);
    }

    public function cities(Request $request)
    {
        $data = $this->service->getCities($request->country_id);
        return response()->json($data);
    }

    public function barberia(Request $request)
    {
        try {
            $data = $this->service->getShopBasicStats($request->user());
            return response()->json(['stats' => $data]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }

    public function incomeChart(Request $request)
    {
        $validated = $request->validate(['days' => 'sometimes|integer|min:1|max:366', 'shop_id' => 'sometimes|integer|min:1']);
        $user = $request->user();
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true), 403);
        $shopId = $validated['shop_id'] ?? null;
        if ($user->role === 'ADMIN_BARBERIA') {
            $businesses = \App\Modules\Business\Models\Business::where('owner_user_id', $user->id);
            $shopId = $shopId ? $businesses->whereKey($shopId)->value('id') : $businesses->value('id');
            abort_unless($shopId, 403);
        }
        $data = $this->service->getIncomeChart($validated['days'] ?? 30, $shopId);
        return response()->json(['data' => $data]);
    }
}