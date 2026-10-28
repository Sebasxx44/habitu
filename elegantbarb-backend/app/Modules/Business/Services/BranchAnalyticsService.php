<?php

namespace App\Modules\Business\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class BranchAnalyticsService
{
    public function overview(Builder $branches, AnalyticsPeriod $period): array
    {
        $now = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'));
        $start = $period->start->toDateString();
        $end = $period->end->toDateString();
        $currency = $period->currency;
        $ids = (clone $branches)->select('business.business_branches.id');
        $rows = Appointment::whereIn('branch_id', $ids)->whereBetween('date', [$start, $end])
            ->selectRaw("branch_id, COUNT(*) AS appointments,
                COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
                COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show,
                COUNT(DISTINCT client_id) FILTER (WHERE status = 'COMPLETED') AS clients,
                COALESCE(SUM(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?), 0) AS revenue,
                AVG(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?) AS average_ticket", [$currency, $currency])
            ->groupBy('branch_id')->get()->keyBy('branch_id');
        $upcoming = Appointment::whereIn('branch_id', $ids)->whereIn('status', ['PENDING', 'CONFIRMED'])
            ->where(fn (Builder $query) => $query->where('date', '>', $now->toDateString())
                ->orWhere(fn (Builder $today) => $today->where('date', $now->toDateString())->where('start_time', '>=', $now->format('H:i:s'))))
            ->selectRaw('branch_id, COUNT(*) AS count')->groupBy('branch_id')->pluck('count', 'branch_id');
        $metrics = (clone $branches)->pluck('id')->mapWithKeys(fn ($id) => [$id => [
            'appointments' => (int) ($rows[$id]?->appointments ?? 0),
            'completed' => (int) ($rows[$id]?->completed ?? 0),
            'cancelled' => (int) ($rows[$id]?->cancelled ?? 0),
            'noShow' => (int) ($rows[$id]?->no_show ?? 0),
            'clients' => (int) ($rows[$id]?->clients ?? 0),
            'revenue' => (float) ($rows[$id]?->revenue ?? 0),
            'averageTicket' => isset($rows[$id]) && $rows[$id]->average_ticket !== null ? round((float) $rows[$id]->average_ticket, 2) : null,
            'upcoming' => (int) ($upcoming[$id] ?? 0),
        ]]);

        return [
            'metrics' => $metrics,
            'branches' => (clone $branches)->reorder()->orderBy('name')->orderBy('id')->get(['id', 'name'])
                ->map(fn ($branch) => ['id' => $branch->id, 'name' => $branch->name, 'metrics' => $metrics[$branch->id]])->all(),
            'summary' => [
                'branches' => (clone $branches)->count(),
                'active' => (clone $branches)->where('is_active', true)->count(),
                'appointments' => $metrics->sum('appointments'), 'revenue' => $metrics->sum('revenue'),
                'upcoming' => $metrics->sum('upcoming'), 'currency' => $currency,
                'start' => $start, 'end' => $end, 'days' => $period->days,
            ],
        ];
    }
}
