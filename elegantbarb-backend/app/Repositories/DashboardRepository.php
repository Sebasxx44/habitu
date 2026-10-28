<?php

namespace App\Repositories;

use App\Interfaces\Repositories\DashboardRepositoryInterface;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\Client;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Catalog\Models\Service;
use Illuminate\Support\Facades\DB;

class DashboardRepository implements DashboardRepositoryInterface
{
    public function getSuperadminDashboardData($filters)
    {
        $period = $filters['period'] ?? 'month';
        $countryId = $filters['country_id'] ?? null;
        $cityId = $filters['city_id'] ?? null;

        $query = Business::with(['branches'])->where('is_active', true);

        $businesses = $query->get();
        $businessIds = $businesses->pluck('id');

        $startDate = match ($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            'year' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        $appointments = Appointment::whereIn('business_id', $businessIds)
            ->where('date', '>=', $startDate->format('Y-m-d'))
            ->where('status', 'COMPLETED');

        $lastMonthStart = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();
        $lastMonthRevenue = Appointment::whereIn('business_id', $businessIds)
            ->where('date', '>=', $lastMonthStart->format('Y-m-d'))
            ->where('date', '<=', $lastMonthEnd->format('Y-m-d'))
            ->where('status', 'COMPLETED')
            ->sum(DB::raw('COALESCE(final_price, price, 0)'));

        $currentMonthRevenue = $appointments->clone()->sum(DB::raw('COALESCE(final_price, price, 0)'));
        $growth = $lastMonthRevenue > 0 ? (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100 : 100;

        $stats = [
            'totalShops' => $businesses->count(),
            'activeShops' => $businesses->where('is_active', true)->count(),
            'expiredShops' => 0,
            'totalBarbers' => Professional::whereIn('business_id', $businessIds)->count(),
            'totalClients' => Client::whereIn('business_id', $businessIds)->count(),
            'monthRevenue' => $currentMonthRevenue,
            'growth' => round($growth, 2),
            'avgTicket' => $appointments->clone()->count() > 0 ? round($currentMonthRevenue / $appointments->clone()->count(), 2) : 0,
            'totalAppointments' => $appointments->clone()->count(),
        ];

        $incomeByShop = $businesses->map(fn($shop) => [
            'id' => $shop->id,
            'shop' => $shop->name,
            'address' => $shop->branches->first()?->address ?? 'Sin dirección',
            'income' => Appointment::where('business_id', $shop->id)
                ->where('date', '>=', $startDate->format('Y-m-d'))
                ->where('status', 'COMPLETED')->sum(DB::raw('COALESCE(final_price, price, 0)')),
            'license' => ['status' => $shop->is_active ? 'ACTIVA' : 'INACTIVA'],
        ])->sortByDesc('income')->values();

        $dailyIncome = Appointment::whereIn('business_id', $businessIds)
            ->where('date', '>=', now()->subDays(30)->format('Y-m-d'))
            ->where('status', 'COMPLETED')
            ->select(DB::raw('date as label'), DB::raw('SUM(COALESCE(final_price, price, 0)) as income'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Country stats via branch city (simplified)
        $countryStats = collect([
            ['name' => 'Colombia', 'shops' => $businesses->count(), 'revenue' => $currentMonthRevenue]
        ]);

        $appointmentsByStatus = Appointment::whereIn('business_id', $businessIds)
            ->where('date', '>=', $startDate->format('Y-m-d'))
            ->select(DB::raw('status as label'), DB::raw('COUNT(*) as value'))
            ->groupBy('status')
            ->get();

        $topPerformingBarbers = Professional::whereIn('business_id', $businessIds)
            ->get()
            ->map(fn($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'shop' => $b->business?->name,
                'revenue' => Appointment::where('professional_id', $b->id)->where('status', 'COMPLETED')->where('date', '>=', $startDate->format('Y-m-d'))->sum(DB::raw('COALESCE(final_price, price, 0)')),
                'appointments' => Appointment::where('professional_id', $b->id)->where('date', '>=', $startDate->format('Y-m-d'))->count(),
            ])->sortByDesc('revenue')->values()->slice(0, 5);

        $totalClientsGlobal = Client::count();
        $globalRetention = $totalClientsGlobal > 0
            ? round((Appointment::select('client_id')->groupBy('client_id')->having(DB::raw('count(*)'), '>', 1)->get()->count() / $totalClientsGlobal) * 100, 2)
            : 0;

        $revenueByService = Appointment::join('catalog.services', 'booking.appointments.service_id', '=', 'catalog.services.id')
            ->where('booking.appointments.status', 'COMPLETED')
            ->where('booking.appointments.date', '>=', $startDate->format('Y-m-d'))
            ->select('catalog.services.name as label', DB::raw('SUM(COALESCE(booking.appointments.final_price, booking.appointments.price, 0)) as value'))
            ->groupBy('catalog.services.name')
            ->orderBy('value', 'desc')
            ->get();

        $stats['growth'] = round($growth, 1);
        $stats['globalRetention'] = $globalRetention;

        return compact('stats', 'incomeByShop', 'dailyIncome', 'countryStats', 'appointmentsByStatus', 'topPerformingBarbers', 'revenueByService');
    }

    public function getAdminDashboardData($shopId)
    {
        $shop = Business::with(['branches', 'category'])->find($shopId);

        $monthStart = now()->startOfMonth()->format('Y-m-d');
        $monthAppts = Appointment::where('business_id', $shopId)
            ->where('date', '>=', $monthStart)
            ->get();

        $completedMonth = $monthAppts->where('status', 'COMPLETED');

        $totalClients = Client::where('business_id', $shopId)->count();
        $returningClients = Appointment::where('business_id', $shopId)
            ->select('client_id', DB::raw('count(*) as count'))
            ->groupBy('client_id')
            ->having(DB::raw('count(*)'), '>', 1)
            ->get()->count();

        $stats = [
            'monthRevenue' => $completedMonth->sum(fn($a) => $a->final_price ?? $a->price ?? 0),
            'totalAppointments' => $monthAppts->count(),
            'completedAppointments' => $completedMonth->count(),
            'avgTicket' => $completedMonth->count() > 0 ? round($completedMonth->sum(fn($a) => $a->final_price ?? $a->price ?? 0) / $completedMonth->count(), 2) : 0,
            'retentionRate' => $totalClients > 0 ? round(($returningClients / $totalClients) * 100, 2) : 0,
            'noShowRate' => $monthAppts->count() > 0 ? round(($monthAppts->where('status', 'NO_SHOW')->count() / $monthAppts->count()) * 100, 2) : 0,
        ];

        $barberPerformance = Professional::where('business_id', $shopId)->get()->map(fn($b) => [
            'name' => $b->name,
            'appointments' => Appointment::where('professional_id', $b->id)->where('date', '>=', $monthStart)->count(),
            'revenue' => Appointment::where('professional_id', $b->id)->where('date', '>=', $monthStart)->where('status', 'COMPLETED')->sum(DB::raw('COALESCE(final_price, price, 0)')),
        ])->sortByDesc('revenue')->values();

        $peakHours = Appointment::where('business_id', $shopId)
            ->where('date', '>=', now()->subDays(30)->format('Y-m-d'))
            ->select(DB::raw("EXTRACT(HOUR FROM start_time::time) as hour"), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw("EXTRACT(HOUR FROM start_time::time)"))
            ->orderBy('hour')
            ->get();

        $serviceStats = Appointment::where('booking.appointments.business_id', $shopId)
            ->where('booking.appointments.status', 'COMPLETED')
            ->join('catalog.services', 'booking.appointments.service_id', '=', 'catalog.services.id')
            ->select(DB::raw('catalog.services.name as label'), DB::raw('COUNT(*) as value'), DB::raw('SUM(COALESCE(booking.appointments.final_price, booking.appointments.price, 0)) as revenue'))
            ->groupBy('catalog.services.name')
            ->orderBy('value', 'desc')
            ->get();

        $dailyIncome = Appointment::where('business_id', $shopId)
            ->where('date', '>=', now()->subDays(30)->format('Y-m-d'))
            ->where('status', 'COMPLETED')
            ->select(DB::raw('date as label'), DB::raw('SUM(COALESCE(final_price, price, 0)) as income'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return compact('stats', 'shop', 'barberPerformance', 'peakHours', 'serviceStats', 'dailyIncome');
    }

    public function getBarberDashboardData($barberId, $startDate, $endDate, ?string $requestedCurrency = null)
    {
        $barber = Professional::with(['business', 'availability'])->find($barberId);
        $now = now(config('booking.timezone', 'America/Bogota'));
        $currencies = Appointment::where('professional_id', $barberId)->whereBetween('date', [$startDate, $endDate])
            ->distinct()->orderBy('currency')->pluck('currency')->all();
        $currency = $requestedCurrency ?? (in_array('COP', $currencies, true) ? 'COP' : ($currencies[0] ?? 'COP'));
        $period = ['start' => $startDate, 'end' => $endDate];

        $todayAppts = Appointment::where('professional_id', $barberId)
            ->where('date', $now->format('Y-m-d'))
            ->with(['client', 'service'])
            ->orderBy('start_time')
            ->get();

        $weekAppts = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $now->copy()->startOfWeek()->format('Y-m-d'))
            ->where('date', '<=', $now->copy()->endOfWeek()->format('Y-m-d'))
            ->with(['client', 'service'])
            ->get();

        $recentAppointments = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->with(['client', 'service'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc')
            ->limit(20)
            ->get();

        $myClients = Client::whereIn('id', Appointment::where('professional_id', $barberId)
            ->whereBetween('date', [$startDate, $endDate])->select('client_id'))->get();

        $rangeAppts = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->get();

        $stats = [
            'totalClients' => $myClients->count(),
            'todayAppointments' => $todayAppts->count(),
            'weekAppointments' => $weekAppts->count(),
            'monthAppointments' => $rangeAppts->count(),
            'dayRevenue' => $todayAppts->where('status', \App\Core\Enums\AppointmentStatus::COMPLETED)->where('currency', $currency)->sum(fn($a) => $a->final_price ?? $a->price ?? 0),
            'monthRevenue' => $rangeAppts->where('status', \App\Core\Enums\AppointmentStatus::COMPLETED)->where('currency', $currency)->sum(fn($a) => $a->final_price ?? $a->price ?? 0),
        ];

        $dailyIncome = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->where('status', 'COMPLETED')
            ->where('currency', $currency)
            ->select(DB::raw('date as label'), DB::raw('SUM(COALESCE(final_price, price, 0)) as income'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $serviceBreakdown = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->where('status', 'COMPLETED')
            ->join('catalog.services', 'booking.appointments.service_id', '=', 'catalog.services.id')
            ->select(DB::raw('catalog.services.name as name'), DB::raw('COUNT(*) as value'))
            ->groupBy('catalog.services.name')
            ->orderBy('value', 'desc')
            ->get();

        $statusBreakdown = Appointment::where('professional_id', $barberId)
            ->where('date', '>=', $startDate)
            ->where('date', '<=', $endDate)
            ->select(DB::raw('status as name'), DB::raw('COUNT(*) as value'))
            ->groupBy('status')
            ->get();

        return compact('currency', 'currencies', 'period', 'stats', 'barber', 'todayAppts', 'weekAppts', 'recentAppointments', 'myClients', 'dailyIncome', 'serviceBreakdown', 'statusBreakdown');
    }

    public function getClientDashboardData($clientId)
    {
        $client = Client::with(['business'])->find($clientId);
        $shopId = $client?->business_id;

        $appointments = Appointment::where('client_id', $clientId)
            ->with(['professional', 'service'])
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc')
            ->get();

        $upcoming = $appointments->filter(fn($a) => $a->date >= now()->format('Y-m-d') && in_array($a->status, ['PENDING', 'CONFIRMED']))->values();
        $past = $appointments->filter(fn($a) => $a->date < now()->format('Y-m-d') || $a->status === 'COMPLETED')->values();

        $services = Service::where('business_id', $shopId)->get();

        $popularServices = Service::where('business_id', $shopId)
            ->withCount('appointments')
            ->orderBy('appointments_count', 'desc')
            ->limit(5)
            ->get();

        $loyalty = \App\Modules\Loyalty\Models\LoyaltyCard::where('client_id', $clientId)
            ->where('status', 'ACTIVE')
            ->with('program')
            ->first();

        $stats = [
            'totalAppointments' => $appointments->count(),
            'upcomingAppointments' => $upcoming->count(),
            'completedAppointments' => $past->count(),
            'totalSpent' => $appointments->where('status', 'COMPLETED')->sum(fn($a) => $a->final_price ?? $a->price ?? 0),
            'unreadNotifications' => \App\Models\Notification::where('user_id', auth()->id())->where('read', false)->count(),
        ];

        $nearShops = [];
        if ($stats['upcomingAppointments'] === 0) {
            $nearShops = Business::with(['branches', 'reviews', 'services'])->where('is_active', true)->limit(10)->get();
        }

        return compact('stats', 'client', 'appointments', 'upcoming', 'services', 'popularServices', 'loyalty', 'nearShops');
    }

    public function getShopsMap()
    {
        return Business::with('branches')
            ->where('is_active', true)
            ->get()
            ->map(fn($biz) => [
                'id' => $biz->id,
                'name' => $biz->name,
                'address' => $biz->branches->first()?->address ?? '',
                'lat' => $biz->branches->first()?->lat,
                'lng' => $biz->branches->first()?->lng,
                'license' => ['status' => $biz->is_active ? 'ACTIVA' : 'INACTIVA'],
            ])
            ->filter(fn($s) => $s['lat'] && $s['lng'])
            ->values();
    }

    public function getCountriesWithShops()
    {
        return collect([['name' => 'Colombia', 'barber_shops_count' => Business::where('is_active', true)->count()]]);
    }

    public function getCities($countryId = null)
    {
        return collect([]);
    }

    public function getBasicShopStats($shopId)
    {
        return [
            'totalClients' => Client::where('business_id', $shopId)->count(),
            'totalBarbers' => Professional::where('business_id', $shopId)->count(),
            'dayAppointments' => Appointment::where('business_id', $shopId)->where('date', now()->format('Y-m-d'))->count(),
            'monthRevenue' => Appointment::where('business_id', $shopId)
                ->where('date', '>=', now()->startOfMonth()->format('Y-m-d'))
                ->where('status', 'COMPLETED')->sum(DB::raw('COALESCE(final_price, price, 0)')),
        ];
    }

    public function getIncomeChartData($days, $shopId = null)
    {
        $query = Appointment::where('status', 'COMPLETED')
            ->whereBetween('date', [now(config('booking.timezone', 'America/Bogota'))->subDays($days - 1)->toDateString(), now(config('booking.timezone', 'America/Bogota'))->toDateString()])
            ->where('currency', 'COP');

        if ($shopId) {
            $query->where('business_id', $shopId);
        }

        return $query->select(DB::raw('date as label'), DB::raw('SUM(COALESCE(final_price, price, 0)) as income'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();
    }
}
