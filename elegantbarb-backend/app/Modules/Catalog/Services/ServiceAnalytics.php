<?php

namespace App\Modules\Catalog\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Catalog\Models\Service;

class ServiceAnalytics
{
    public function performance(\Illuminate\Database\Eloquent\Builder $scope, \App\Modules\Analytics\Services\AnalyticsPeriod $period, ?int $businessId = null): array
    {
        $services = Service::query()->when($businessId !== null, fn ($query) => $query->where('business_id', $businessId))->get(['id', 'name', 'price']);
        $current = (clone $scope)->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()])
            ->selectRaw("service_id, COUNT(*) AS reservations, COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
                COALESCE(SUM(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?), 0) AS revenue,
                AVG(final_price) FILTER (WHERE currency = ?) AS average_price", [$period->currency, $period->currency])
            ->groupBy('service_id')->get()->keyBy('service_id');
        $previous = (clone $scope)->whereBetween('date', [$period->previousStart->toDateString(), $period->previousEnd->toDateString()])
            ->selectRaw('service_id, COUNT(*) AS reservations')->groupBy('service_id')->pluck('reservations', 'service_id');
        return $services->map(function ($service) use ($current, $previous) {
            $row = $current->get($service->id);
            $count = (int) ($row?->reservations ?? 0);
            $old = (int) ($previous[$service->id] ?? 0);
            return ['id' => $service->id, 'name' => $service->name, 'reservations' => $count, 'completed' => (int) ($row?->completed ?? 0),
                'cancelled' => (int) ($row?->cancelled ?? 0), 'revenue' => (float) ($row?->revenue ?? 0),
                'averagePrice' => $row?->average_price === null ? null : round((float) $row->average_price, 2),
                'previous' => $old, 'change' => $old > 0 ? round(($count - $old) / $old * 100, 1) : null];
        })->sortByDesc('reservations')->values()->all();
    }

    public function overview(Service $service): array
    {
        $query = Appointment::where('service_id', $service->id)->where('business_id', $service->business_id)
            ->where('date', '<=', now(config('booking.timezone', 'America/Bogota'))->toDateString());
        $completed = (clone $query)->where('status', 'COMPLETED')->where('currency', 'COP');
        $month = (clone $query)->where('date', '>=', now(config('booking.timezone', 'America/Bogota'))->startOfMonth()->toDateString());
        $total = (clone $query)->count();

        return [
            'currency' => 'COP',
            'stats' => [
                'totalAppointments' => $total, 'totalRevenue' => (float) (clone $completed)->sum('final_price'),
                'monthAppointments' => (clone $month)->count(),
                'monthRevenue' => (float) (clone $month)->where('status', 'COMPLETED')->where('currency', 'COP')->sum('final_price'),
                'avgPrice' => (float) ((clone $completed)->avg('final_price') ?? 0),
                'completionRate' => $total > 0 ? round((clone $query)->where('status', 'COMPLETED')->count() / $total * 100, 1) : 0,
            ],
            'weeklyTrend' => (clone $completed)->where('date', '>=', now(config('booking.timezone', 'America/Bogota'))->subDays(6)->toDateString())
                ->selectRaw('date as label, COUNT(*) as citas')->groupBy('date')->orderBy('date')->get(),
            'statusDistribution' => (clone $query)->selectRaw('status as name, COUNT(*) as value')->groupBy('status')->get()
                ->map(fn ($row) => ['name' => $row->name, 'value' => (int) $row->value, 'color' => match ($row->name) { 'COMPLETED' => '#15803d', 'CANCELLED' => '#be123c', default => '#b45309' }]),
            'topBarbers' => (clone $completed)->whereNotNull('professional_id')->with('professional')
                ->selectRaw('professional_id, COUNT(*) as total_citas, SUM(final_price) as total_revenue')
                ->groupBy('professional_id')->orderByDesc('total_revenue')->limit(10)->get()
                ->map(fn ($row) => ['barber_id' => $row->professional_id, 'name' => $row->professional?->name ?? 'Profesional archivado',
                    'photo_url' => $row->professional?->photo_url, 'specialty' => $row->professional?->specialty,
                    'total_citas' => (int) $row->total_citas, 'total_revenue' => (float) $row->total_revenue]),
            'topClients' => (clone $completed)->with('client')
                ->selectRaw('client_id, COUNT(*) as total_visits, SUM(final_price) as total_spent, MAX(date) as last_visit')
                ->groupBy('client_id')->orderByDesc('total_spent')->limit(10)->get()
                ->map(fn ($row) => ['id' => $row->client_id, 'name' => $row->client?->name ?? 'Cliente archivado',
                    'email' => $row->client?->email, 'total_visits' => (int) $row->total_visits,
                    'total_spent' => (float) $row->total_spent, 'last_visit' => $row->last_visit]),
        ];
    }
}
