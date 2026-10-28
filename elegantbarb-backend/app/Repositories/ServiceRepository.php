<?php

namespace App\Repositories;

use App\Interfaces\Repositories\ServiceRepositoryInterface;
use App\Modules\Catalog\Models\Service;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ServiceRepository extends BaseRepository implements ServiceRepositoryInterface
{
    public function __construct(Service $model)
    {
        parent::__construct($model);
    }

    public function getServiceStats($service)
    {
        $allAppts = Appointment::where('service_id', $service->id)->get();
        $completedAppts = $allAppts->where('status', 'COMPLETADA');

        $startOfMonth = Carbon::now()->startOfMonth();
        $monthAppts = $allAppts->filter(fn($a) => Carbon::parse($a->date)->gte($startOfMonth));
        $monthCompleted = $monthAppts->where('status', 'COMPLETADA');

        $stats = [
            'totalAppointments' => $allAppts->count(),
            'completedAppointments' => $completedAppts->count(),
            'cancelledAppointments' => $allAppts->where('status', 'CANCELADA')->count(),
            'pendingAppointments' => $allAppts->where('status', 'PENDIENTE')->count(),
            'totalRevenue' => $completedAppts->sum('price'),
            'monthAppointments' => $monthAppts->count(),
            'monthRevenue' => $monthCompleted->sum('price'),
            'avgPrice' => $completedAppts->count() > 0 ? round($completedAppts->avg('price'), 2) : 0,
            'completionRate' => $allAppts->count() > 0
                ? round(($completedAppts->count() / $allAppts->count()) * 100, 1)
                : 0,
        ];

        $topBarbers = Appointment::where('service_id', $service->id)
            ->where('booking.appointments.status', 'COMPLETADA')
            ->join('people.professionals', 'booking.appointments.professional_id', '=', 'people.professionals.id')
            ->where('people.professionals.business_id', $service->business_id)
            ->select('booking.appointments.professional_id', DB::raw('COUNT(booking.appointments.id) as total_citas'), DB::raw('SUM(booking.appointments.price) as total_revenue'))
            ->groupBy('booking.appointments.professional_id')
            ->orderByDesc('total_citas')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $barber = \App\Modules\People\Models\Professional::find($row->professional_id);
                return [
                    'barber_id' => $row->professional_id,
                    'name' => $barber?->name ?? 'Desconocido',
                    'photo_url' => $barber?->photo_url,
                    'specialty' => $barber?->specialty,
                    'total_citas' => $row->total_citas,
                    'total_revenue' => $row->total_revenue,
                ];
            });

        $topClients = Appointment::where('service_id', $service->id)
            ->where('status', 'COMPLETADA')
            ->select('client_id', DB::raw('COUNT(*) as total_visits'), DB::raw('SUM(price) as total_spent'), DB::raw('MAX(date) as last_visit'))
            ->groupBy('client_id')
            ->orderByDesc('total_visits')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $client = \App\Modules\People\Models\Client::find($row->client_id);
                return [
                    'client_id' => $row->client_id,
                    'name' => $client?->name ?? 'Desconocido',
                    'email' => $client?->email,
                    'phone' => $client?->phone,
                    'total_visits' => $row->total_visits,
                    'total_spent' => $row->total_spent,
                    'last_visit' => $row->last_visit,
                ];
            });

        $weeklyTrend = [];
        for ($i = 7; $i >= 0; $i--) {
            $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
            $weekEnd = Carbon::now()->subWeeks($i)->endOfWeek();
            $weekAppts = $allAppts->filter(fn($a) => Carbon::parse($a->date)->between($weekStart, $weekEnd));
            $weeklyTrend[] = [
                'label' => $weekStart->format('d M'),
                'citas' => $weekAppts->count(),
                'revenue' => $weekAppts->where('status', 'COMPLETADA')->sum('price'),
            ];
        }

        $statusDistribution = [
            ['name' => 'Completada', 'value' => $completedAppts->count(), 'color' => '#10b981'],
            ['name' => 'Pendiente', 'value' => $allAppts->where('status', 'PENDIENTE')->count(), 'color' => '#f59e0b'],
            ['name' => 'Cancelada', 'value' => $allAppts->where('status', 'CANCELADA')->count(), 'color' => '#ef4444'],
        ];

        return [
            'service' => $service,
            'stats' => $stats,
            'topBarbers' => $topBarbers,
            'topClients' => $topClients,
            'weeklyTrend' => $weeklyTrend,
            'statusDistribution' => $statusDistribution,
        ];
    }
}