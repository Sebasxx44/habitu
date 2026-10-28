<?php

namespace App\Modules\Analytics\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Catalog\Services\ServiceAnalytics;
use App\Modules\Platform\Services\DashboardMetrics;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class ReservationAnalytics
{
    public function overview(Builder $scope, AnalyticsPeriod $period, ?int $businessId = null): array
    {
        $current = $this->totals($scope, $period->start, $period->end, $period->currency);
        $previous = $this->totals($scope, $period->previousStart, $period->previousEnd, $period->currency);
        $query = (clone $scope)->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()]);
        $ids = (clone $query)->select('booking.appointments.id');
        $payments = DB::table('finance.payments')->whereIn('appointment_id', $ids)->where('currency', $period->currency)->where('status', 'COMPLETED')->sum('amount');
        $rescheduled = DB::table('booking.appointment_reschedules')->whereIn('appointment_id', (clone $scope)->select('booking.appointments.id'))
            ->whereBetween('created_at', [$period->start, $period->end->endOfDay()])->distinct()->count('appointment_id');
        $ratings = DB::table('reviews.reviews')->whereIn('appointment_id', $ids)->where('is_active', true)->where('is_verified', true)
            ->selectRaw('AVG(rating) AS rating, COUNT(*) AS count')->first();
        $clients = $this->clients($scope, $period);
        $metric = fn (string $id, float|int|null $value, float|int|null $old = null, string $unit = 'count') => [
            'id' => $id, 'value' => $value, 'previous' => $old, 'unit' => $unit,
            'change' => $old !== null && $old > 0 && $value !== null ? round(($value - $old) / $old * 100, 1) : null,
        ];
        return [
            'metrics' => [
                $metric('reservations', $current['reservations'], $previous['reservations']),
                $metric('realizedValue', $current['revenue'], $previous['revenue'], 'currency'),
                $metric('payments', (float) $payments, null, 'currency'),
                $metric('averageTicket', $current['averageTicket'], $previous['averageTicket'], 'currency'),
                $metric('uniqueClients', $clients['unique']), $metric('newClients', $clients['new']), $metric('returningClients', $clients['returning']),
                $metric('completed', $current['completed'], $previous['completed']),
                $metric('cancelled', $current['cancelled'], $previous['cancelled']), $metric('noShow', $current['noShow'], $previous['noShow']),
                $metric('rescheduled', $rescheduled), $metric('recurrence', $clients['rate'], null, 'percent'),
                $metric('averageDuration', $current['duration'], $previous['duration'], 'minutes'),
                $metric('rating', $ratings?->rating !== null ? round((float) $ratings->rating, 2) : null, null, 'rating'),
                $metric('occupancy', null, null, 'percent'),
                $metric('retention', $clients['retention'], null, 'percent'),
            ],
            'series' => $this->series($scope, $period),
            'statuses' => (clone $query)->selectRaw('status, COUNT(*) AS count')->groupBy('status')->get()->map(fn ($row) => ['id' => $row->getRawOriginal('status'), 'value' => (int) $row->count])->all(),
            'hours' => (clone $query)->selectRaw('EXTRACT(HOUR FROM start_time)::integer AS hour, COUNT(*) AS count')->groupByRaw('EXTRACT(HOUR FROM start_time)')->orderBy('hour')->get()->map(fn ($row) => ['id' => sprintf('%02d:00', $row->hour), 'value' => (int) $row->count])->all(),
            'weekdays' => (clone $query)->selectRaw('EXTRACT(DOW FROM date)::integer AS day, COUNT(*) AS count')->groupByRaw('EXTRACT(DOW FROM date)')->orderBy('day')->get()->map(fn ($row) => ['id' => (string) $row->day, 'value' => (int) $row->count])->all(),
            'services' => app(ServiceAnalytics::class)->performance($scope, $period, $businessId),
            'professionals' => $this->performance($scope, $period, 'professional_id', 'people.professionals'),
            'resources' => $this->performance($scope, $period, 'resource_id', 'booking.resources'),
            'branches' => $this->performance($scope, $period, 'branch_id', 'business.business_branches'),
            'promotions' => DB::table('marketing.promotion_redemptions as redemption')->join('marketing.promotions as promotion', 'promotion.id', '=', 'redemption.promotion_id')
                ->whereIn('redemption.appointment_id', (clone $query)->where('currency', $period->currency)->select('booking.appointments.id'))
                ->selectRaw('promotion.id, promotion.title AS name, COUNT(*) AS reservations, COALESCE(SUM(redemption.saved_amount), 0) AS discount')->groupBy('promotion.id', 'promotion.title')->orderByDesc('reservations')->limit(30)->get()->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'reservations' => (int) $row->reservations, 'discount' => (float) $row->discount])->all(),
            'currencies' => (clone $scope)->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()])->distinct()->orderBy('currency')->pluck('currency')->values()->all(),
            'ratingCount' => (int) ($ratings?->count ?? 0),
        ];
    }

    private function totals(Builder $scope, CarbonImmutable $start, CarbonImmutable $end, string $currency): array
    {
        $row = (clone $scope)->whereBetween('date', [$start->toDateString(), $end->toDateString()])->selectRaw("COUNT(*) AS reservations,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed, COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
            COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_show,
            COALESCE(SUM(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?), 0) AS revenue,
            AVG(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?) AS ticket,
            AVG(COALESCE(duration_minutes, EXTRACT(EPOCH FROM (end_time - start_time))/60)) FILTER (WHERE status <> 'CANCELLED') AS duration", [$currency, $currency])->first();
        return ['reservations' => (int) $row->reservations, 'completed' => (int) $row->completed, 'cancelled' => (int) $row->cancelled,
            'noShow' => (int) $row->no_show, 'revenue' => (float) $row->revenue, 'averageTicket' => $row->ticket === null ? null : round((float) $row->ticket, 2), 'duration' => $row->duration === null ? null : round((float) $row->duration, 1)];
    }

    private function clients(Builder $scope, AnalyticsPeriod $period): array
    {
        $visits = (clone $scope)->join('people.clients as analytics_client', 'analytics_client.id', '=', 'booking.appointments.client_id')
            ->where('status', '<>', 'CANCELLED')->where('date', '<=', $period->end->toDateString())
            ->selectRaw("COALESCE('u:' || analytics_client.user_id::text, 'c:' || analytics_client.id::text) AS identity,
                MIN(date) AS first_date, COUNT(*) FILTER (WHERE date >= ?) AS visits,
                COUNT(*) FILTER (WHERE date BETWEEN ? AND ?) AS previous_visits", [$period->start->toDateString(), $period->previousStart->toDateString(), $period->previousEnd->toDateString()])
            ->groupByRaw("COALESCE('u:' || analytics_client.user_id::text, 'c:' || analytics_client.id::text)")->get();
        $current = $visits->filter(fn ($row) => (int) $row->visits > 0);
        $new = $current->filter(fn ($row) => $row->first_date >= $period->start->toDateString())->count();
        $returning = $current->count() - $new;
        return ['unique' => $current->count(), 'new' => $new, 'returning' => $returning, 'rate' => $current->count() ? round($returning / $current->count() * 100, 1) : null,
            'retention' => $visits->where('previous_visits', '>', 0)->count() ? round($current->where('previous_visits', '>', 0)->count() / $visits->where('previous_visits', '>', 0)->count() * 100, 1) : null];
    }

    private function series(Builder $scope, AnalyticsPeriod $period): array
    {
        $daily = app(DashboardMetrics::class)->series($scope, $period->start, $period->end, $period->currency);
        $previous = app(DashboardMetrics::class)->series($scope, $period->previousStart, $period->previousEnd, $period->currency);
        $buckets = [];
        foreach ($daily as $index => $day) {
            $bucket = $period->bucket(CarbonImmutable::parse($day['date']));
            $buckets[$bucket] ??= ['date' => $bucket, 'reservations' => 0, 'completed' => 0, 'cancelled' => 0, 'revenue' => 0, 'previousReservations' => 0, 'previousRevenue' => 0];
            foreach (['reservations' => 'appointments', 'completed' => 'completed', 'cancelled' => 'cancelled', 'revenue' => 'revenue'] as $key => $source) $buckets[$bucket][$key] += $day[$source];
            $buckets[$bucket]['previousReservations'] += $previous[$index]['appointments'];
            $buckets[$bucket]['previousRevenue'] += $previous[$index]['revenue'];
        }
        return array_values($buckets);
    }

    public function performance(Builder $scope, AnalyticsPeriod $period, string $dimension, string $table): array
    {
        $rows = (clone $scope)->whereNotNull($dimension)->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()])
            ->selectRaw("{$dimension} AS dimension_id, COUNT(*) AS reservations, COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
                COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled, COUNT(DISTINCT client_id) FILTER (WHERE status = 'COMPLETED') AS clients,
                COALESCE(SUM(final_price) FILTER (WHERE status = 'COMPLETED' AND currency = ?), 0) AS revenue", [$period->currency])
            ->groupBy($dimension)->orderByDesc('reservations')->limit(100)->get();
        $names = DB::table($table)->whereIn('id', $rows->pluck('dimension_id'))->pluck('name', 'id');
        $appointments = (clone $scope)->whereIn($dimension, $rows->pluck('dimension_id'))->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()]);
        $hours = (clone $appointments)->selectRaw("{$dimension} AS dimension_id, EXTRACT(HOUR FROM start_time)::integer AS hour, COUNT(*) AS count")
            ->groupBy($dimension)->groupByRaw('EXTRACT(HOUR FROM start_time)')->orderBy('hour')->get()->groupBy('dimension_id');
        $services = (clone $appointments)->selectRaw("{$dimension} AS dimension_id, service_id, COUNT(*) AS count")
            ->groupBy($dimension, 'service_id')->orderByDesc('count')->get();
        $serviceNames = DB::table('catalog.services')->whereIn('id', $services->pluck('service_id'))->pluck('name', 'id');
        $serviceGroups = $services->groupBy('dimension_id');
        $ratings = $dimension === 'professional_id' ? DB::table('reviews.reviews as review')->join('booking.appointments as appointment', 'appointment.id', '=', 'review.appointment_id')
            ->whereIn('review.appointment_id', (clone $appointments)->select('booking.appointments.id'))->where('review.is_active', true)->where('review.is_verified', true)
            ->selectRaw('appointment.professional_id AS dimension_id, AVG(COALESCE(review.professional_rating, review.rating)) AS rating, COUNT(*) AS count')->groupBy('appointment.professional_id')->get()->keyBy('dimension_id') : collect();
        return $rows->map(fn ($row) => ['id' => (int) $row->dimension_id, 'name' => $names[$row->dimension_id] ?? 'Archivado', 'reservations' => (int) $row->reservations,
            'completed' => (int) $row->completed, 'cancelled' => (int) $row->cancelled, 'clients' => (int) $row->clients, 'revenue' => (float) $row->revenue, 'occupancy' => null,
            'rating' => isset($ratings[$row->dimension_id]) ? round((float) $ratings[$row->dimension_id]->rating, 2) : null,
            'ratingCount' => isset($ratings[$row->dimension_id]) ? (int) $ratings[$row->dimension_id]->count : 0,
            'hours' => ($hours[$row->dimension_id] ?? collect())->map(fn ($hour) => ['id' => sprintf('%02d:00', $hour->hour), 'value' => (int) $hour->count])->values()->all(),
            'services' => ($serviceGroups[$row->dimension_id] ?? collect())->map(fn ($service) => ['id' => (int) $service->service_id, 'name' => $serviceNames[$service->service_id] ?? 'Archivado', 'reservations' => (int) $service->count])->values()->all(),
        ])->all();
    }
}
