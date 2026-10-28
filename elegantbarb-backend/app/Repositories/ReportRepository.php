<?php

namespace App\Repositories;

use App\Core\Support\Money;
use App\Interfaces\Repositories\ReportRepositoryInterface;
use App\Modules\Booking\Models\Appointment;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\Client;
use App\Modules\Business\Models\Business;
use App\Modules\Reviews\Models\Review;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReportRepository implements ReportRepositoryInterface
{
    public function getDetailedReportData($shopId, $startDate, $endDate, ?string $requestedCurrency = null)
    {
        $ids = $shopId === null ? null : (is_array($shopId) ? $shopId : [$shopId]);
        $scope = Appointment::query()->when($ids !== null, fn ($query) => $query->whereIn('business_id', $ids));
        $start = $startDate->format('Y-m-d');
        $end = $endDate->format('Y-m-d');
        $period = (clone $scope)->whereBetween('date', [$start, $end]);
        $currencies = (clone $period)->distinct()->orderBy('currency')->pluck('currency')->all();
        $currency = $requestedCurrency ?? (in_array('COP', $currencies, true) ? 'COP' : ($currencies[0] ?? 'COP'));
        abort_if((clone $period)->where('currency', $currency)->count() > config('reports.max_interactive_rows', 10000), 422,
            'Este período supera 10.000 registros. Usa la exportación masiva o reduce el período para consultar los gráficos.');
        $appointments = $period->where('currency', $currency)
            ->with(['client', 'professional', 'service.category', 'business', 'branch'])
            ->orderBy('date')->orderBy('start_time')->get();
        $completed = $appointments->filter(fn ($appointment) => $appointment->getRawOriginal('status') === 'COMPLETED');
        $payments = $appointments->isEmpty() ? collect() : DB::table('finance.payments')
            ->whereIn('appointment_id', $appointments->pluck('id'))->where('currency', $currency)
            ->whereIn('business_id', $appointments->pluck('business_id')->unique())
            ->where('status', 'COMPLETED')->get()->groupBy('appointment_id');
        $revenue = $this->sum($completed, 'final_price');
        $clientIds = $appointments->pluck('client_id')->filter()->unique();
        $returning = (clone $scope)->where('date', '<', $start)->whereIn('client_id', $clientIds)
            ->distinct()->pluck('client_id')->count();
        $total = $appointments->count();
        $shops = Business::query()->when($ids !== null, fn ($query) => $query->whereIn('id', $ids))->get(['id', 'name']);

        return [
            'shop' => $shops->count() === 1 ? $shops->first()->only(['id', 'name']) : null,
            'currency' => $currency, 'currencies' => $currencies,
            'summary' => [
                'totalRevenue' => $revenue,
                'avgTicket' => $completed->isEmpty() ? 0 : round($revenue / $completed->count(), 2),
                'totalAppointments' => $total, 'completedAppointments' => $completed->count(),
                'completionRate' => $total ? round(100 * $completed->count() / $total, 2) : 0,
                'noShowRate' => $total ? round(100 * $appointments->filter(fn ($a) => $a->getRawOriginal('status') === 'NO_SHOW')->count() / $total, 2) : 0,
                'newClients' => $clientIds->count() - $returning, 'returningClients' => $returning,
                'totalClients' => $clientIds->count(),
                'totalProfessionals' => Professional::query()->when($ids !== null, fn ($query) => $query->whereIn('business_id', $ids))->count(),
            ],
            'barberStats' => $appointments->whereNotNull('professional_id')->groupBy('professional_id')->map(fn ($group) => [
                'name' => $group->first()->professional?->name ?? 'Profesional archivado',
                'appointments' => $group->count(),
                'completed' => $group->filter(fn ($a) => $a->getRawOriginal('status') === 'COMPLETED')->count(),
                'revenue' => $this->sum($group->filter(fn ($a) => $a->getRawOriginal('status') === 'COMPLETED'), 'final_price'),
            ])->sortByDesc('revenue')->values(),
            'topServices' => $appointments->groupBy('service_id')->map(fn ($group) => [
                'name' => $group->first()->service?->name ?? 'Servicio archivado',
                'count' => $group->count(),
                'revenue' => $this->sum($group->filter(fn ($a) => $a->getRawOriginal('status') === 'COMPLETED'), 'final_price'),
            ])->sortByDesc('count')->values(),
            'dailyTrend' => $this->dailyTrend($appointments, $start, $end),
            'statusDistribution' => $appointments->groupBy(fn ($a) => $a->getRawOriginal('status'))
                ->map(fn ($group, $status) => ['status' => $status, 'count' => $group->count()])->values(),
            'paymentMethods' => $payments->flatten(1)->groupBy('method')->map(fn ($group, $method) => [
                'method' => $method, 'count' => $group->count(), 'revenue' => $this->sum($group, 'amount'),
            ])->values(),
            'records' => $appointments->map(fn ($a) => [
                'id' => $a->id, 'fecha' => $a->date->format('Y-m-d'),
                'hora' => substr($a->getRawOriginal('start_time'), 0, 5),
                'cliente' => $a->client?->name ?? 'Cliente archivado', 'telefono' => $a->client?->phone,
                'barbero' => $a->professional?->name ?? 'Sin profesional',
                'servicio' => $a->service?->name ?? 'Servicio archivado',
                'categoria' => $a->service?->category?->name, 'duracion' => $a->service?->duration_minutes,
                'estado' => $a->getRawOriginal('status'), 'currency' => $a->currency,
                'metodo_pago' => $payments->get($a->id, collect())->pluck('method')->unique()->sort()->implode(', ') ?: 'Sin pago registrado',
                'valor_servicio' => (float) $a->price, 'descuento' => (float) $a->discount_amount,
                'valor_final' => (float) $a->final_price, 'total_pagado' => $this->sum($payments->get($a->id, collect()), 'amount'),
                'comision_barbero' => null, 'ganancia_neta' => null,
                'sucursal' => $a->branch?->name ?? $a->business?->name ?? 'Negocio archivado',
            ])->values(),
            'period' => ['start' => $start, 'end' => $end],
        ];
    }

    public function getSuperadminOverviewData($days)
    {
        $report = $this->getDetailedReportData(null, now()->subDays((int) $days - 1)->startOfDay(), now());
        $summary = $report['summary'];
        return [
            'total_appointments' => $summary['totalAppointments'], 'completed_appointments' => $summary['completedAppointments'],
            'total_revenue' => $summary['totalRevenue'], 'currency' => $report['currency'], 'currencies' => $report['currencies'],
            'active_professionals' => Professional::where('is_active', true)->count(),
            'total_businesses' => Business::where('is_active', true)->count(), 'total_clients' => Client::count(),
            'avg_rating' => Review::where('is_active', true)->avg('rating'),
            'appointments_today' => Appointment::whereDate('date', today())->where('currency', $report['currency'])->count(),
        ];
    }

    public function getAdminShopPerformanceData($shopId)
    {
        return $this->getDetailedReportData($shopId, now()->startOfMonth(), now());
    }

    private function dailyTrend(Collection $appointments, string $start, string $end): Collection
    {
        $timezone = config('booking.timezone', 'America/Bogota');
        $firstDay = CarbonImmutable::parse($start, $timezone)->startOfDay();
        $lastDay = CarbonImmutable::parse($end, $timezone)->startOfDay();
        $daily = $appointments->groupBy(fn ($appointment) => $appointment->date->format('Y-m-d'))
            ->map(fn (Collection $group, string $date) => [
                'date' => $date, 'count' => $group->count(),
                'revenue' => $this->sum($group->filter(fn ($appointment) => $appointment->getRawOriginal('status') === 'COMPLETED'), 'final_price'),
            ]);

        return collect(range(0, (int) $firstDay->diffInDays($lastDay)))
            ->map(fn (int $offset) => $firstDay->addDays($offset)->toDateString())
            ->map(fn (string $date) => $daily->get($date, ['date' => $date, 'count' => 0, 'revenue' => 0]));
    }

    private function sum(Collection $records, string $field): float
    {
        return $records->sum(fn ($record) => Money::minor($record->{$field} ?? 0)) / 100;
    }
}
