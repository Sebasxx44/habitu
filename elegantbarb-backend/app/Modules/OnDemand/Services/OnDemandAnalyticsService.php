<?php

namespace App\Modules\OnDemand\Services;

use App\Models\User;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Services\BusinessAccessService;
use Carbon\CarbonImmutable;

final class OnDemandAnalyticsService
{
    public function overview(User $user, AnalyticsPeriod $period, ?int $businessId = null): array
    {
        $scope = match ($user->role) {
            User::ROLE_SUPERADMIN => OnDemandRequest::query(),
            User::ROLE_ADMIN => OnDemandRequest::whereIn('business_id', app(BusinessAccessService::class)->businessIds($user)),
            User::ROLE_PROFESSIONAL => OnDemandRequest::whereIn('professional_id', Professional::where('user_id', $user->id)->select('id')),
            User::ROLE_CLIENT => OnDemandRequest::whereIn('client_id', Client::where('user_id', $user->id)->select('id')),
            default => OnDemandRequest::whereRaw('1 = 0'),
        };
        if ($businessId !== null) $scope->where('business_id', $businessId);
        $start = $period->start->utc()->toDateTimeString();
        $end = $period->end->addDay()->utc()->toDateTimeString();
        $cohort = (clone $scope)->where('created_at', '>=', $start)->where('created_at', '<', $end);
        $counts = (clone $cohort)->selectRaw('status, COUNT(*) AS total')->groupBy('status')->pluck('total', 'status');
        $completed = (int) ($counts['COMPLETED'] ?? 0);
        $cancelled = (int) ($counts['CANCELLED'] ?? 0);
        $acceptance = (clone $cohort)->whereNotNull('accepted_at')->whereColumn('accepted_at', '>=', 'created_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) AS minutes')->first()?->minutes;
        $dailyCreated = (clone $cohort)
            ->selectRaw("(created_at AT TIME ZONE 'UTC' AT TIME ZONE ?)::date AS day, COUNT(*) AS total", [$period->start->timezoneName])
            ->groupByRaw('1')->get()->keyBy('day');
        $dailyCompleted = (clone $scope)->where('status', 'COMPLETED')->where('completed_at', '>=', $start)->where('completed_at', '<', $end)
            ->selectRaw("(completed_at AT TIME ZONE 'UTC' AT TIME ZONE ?)::date AS day, COUNT(*) AS total", [$period->start->timezoneName])
            ->groupByRaw('1')->get()->keyBy('day');
        $labels = ['SEARCHING' => 'Buscando profesional', 'ACCEPTED' => 'Profesional asignado', 'ON_THE_WAY' => 'En camino',
            'IN_PROGRESS' => 'En servicio', 'COMPLETED' => 'Completado', 'CANCELLED' => 'Cancelado'];

        return [
            'period' => $period->toArray(),
            'active' => (int) $counts->except(['COMPLETED', 'CANCELLED'])->sum(),
            'completed' => $completed,
            'expired' => (clone $cohort)->where('status', 'SEARCHING')->where('search_expires_at', '<=', CarbonImmutable::now('UTC'))->count(),
            'completionRate' => $completed + $cancelled > 0 ? round($completed / ($completed + $cancelled) * 100, 2) : null,
            'averageAcceptanceMinutes' => $acceptance === null ? null : round((float) $acceptance, 2),
            'finalRevenue' => (clone $cohort)->where('status', 'COMPLETED')->whereNotNull('final_price')
                ->selectRaw('currency, SUM(final_price) AS amount')->groupBy('currency')->orderBy('currency')->get()
                ->map(fn ($row) => ['currency' => $row->currency, 'amount' => (float) $row->amount])->all(),
            'statuses' => collect($labels)->map(fn (string $label, string $status) => [
                'status' => $status, 'label' => $label, 'count' => (int) ($counts[$status] ?? 0),
            ])->values()->all(),
            'daily' => collect(range(0, $period->days - 1))->map(fn (int $offset) => [
                'date' => $day = $period->start->addDays($offset)->toDateString(),
                'label' => $period->start->addDays($offset)->locale('es')->isoFormat('D MMM'),
                'created' => (int) ($dailyCreated->get($day)?->total ?? 0),
                'completed' => (int) ($dailyCompleted->get($day)?->total ?? 0),
            ])->all(),
        ];
    }
}
