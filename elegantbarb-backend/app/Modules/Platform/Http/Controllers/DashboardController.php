<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function superadmin()
    {
        $stats = [
            'total_businesses' => DB::table('business.businesses')->count(),
            'active_businesses' => DB::table('business.businesses')->where('is_active', true)->count(),
            'businesses_by_category' => DB::table('business.businesses')
                ->join('platform.business_categories', 'business.businesses.business_category_id', '=', 'platform.business_categories.id')
                ->selectRaw('platform.business_categories.name, COUNT(*) as count')
                ->groupBy('platform.business_categories.name')
                ->get(),
            'total_professionals' => DB::table('people.professionals')->count(),
            'total_clients' => DB::table('people.clients')->count(),
            'total_appointments' => DB::table('booking.appointments')->count(),
            'appointments_today' => DB::table('booking.appointments')->whereDate('date', today())->count(),
            'total_reviews' => DB::table('reviews.reviews')->count(),
            'avg_rating' => DB::table('reviews.reviews')->avg('rating') ?: 0,
            'licenses' => [
                'active' => DB::table('business.businesses')->whereNotNull('license_id')->count(),
                'expired' => 0, // TODO: implement license expiration logic
            ],
            'recent_businesses' => DB::table('business.businesses')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['id', 'name', 'created_at', 'is_active']),
        ];
        return ServiceResponse::success($stats, 'Métricas globales obtenidas')->toJsonResponse();
    }

    public function business(Request $request)
    {
        $businessId = $request->user()?->business_id ?? $request->business_id;
        if (!$businessId) return ServiceResponse::error('Negocio no identificado', null, 400)->toJsonResponse();

        $stats = [
            'appointments_today' => DB::table('booking.appointments')->where('business_id', $businessId)->whereDate('date', today())->count(),
            'appointments_week' => DB::table('booking.appointments')->where('business_id', $businessId)->whereBetween('date', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'total_clients' => DB::table('people.clients')->where('business_id', $businessId)->count(),
            'total_professionals' => DB::table('people.professionals')->where('business_id', $businessId)->count(),
            'total_services' => DB::table('catalog.services')->where('business_id', $businessId)->count(),
            'revenue_month' => DB::table('booking.appointments')
                ->where('business_id', $businessId)
                ->whereMonth('date', now()->month)
                ->whereYear('date', now()->year)
                ->where('payment_status', 'PAID')
                ->sum('final_price') ?: 0,
            'pending_appointments' => DB::table('booking.appointments')->where('business_id', $businessId)->whereIn('status', ['PENDING', 'CONFIRMED'])->count(),
        ];
        return ServiceResponse::success($stats, 'Métricas del negocio obtenidas')->toJsonResponse();
    }
}
