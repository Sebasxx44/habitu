<?php

namespace App\Modules\Analytics\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class MarketplaceTelemetry
{
    public function overview(AnalyticsPeriod $period, ?int $businessId = null): array
    {
        $query = DB::table('platform.marketplace_events')->whereBetween('created_at', [$period->start->utc(), $period->end->endOfDay()->utc()]);
        if ($businessId) {
            $query->where(function (Builder $scope) use ($businessId) {
                $scope->where('business_id', $businessId)->orWhere(function (Builder $unattributed) use ($businessId) {
                    $unattributed->whereNull('business_id')->whereExists(function (Builder $eligible) use ($businessId) {
                        $eligible->selectRaw('1')->from('platform.marketplace_events as attributed')->whereColumn('attributed.actor_hash', 'platform.marketplace_events.actor_hash')
                            ->whereColumn('attributed.session_id', 'platform.marketplace_events.session_id')->where('attributed.business_id', $businessId);
                    });
                });
            });
        }
        $minimum = (int) config('analytics.minimum_group', 5);
        $actors = (clone $query)->distinct()->count('actor_hash');
        $available = $actors >= $minimum;
        $stages = ['visit', 'search', 'business_view', 'service_view', 'booking_start', 'slot_selected', 'booking_confirmed'];
        $funnel = array_map(fn ($event) => ['id' => $event, 'sessions' => null, 'rate' => null], $stages);
        if ($available) {
            $sql = 'WITH events AS ('.$query->toSql().'), sessions AS (SELECT DISTINCT actor_hash, session_id FROM events) SELECT ';
            $columns = [];
            $joins = [];
            foreach ($stages as $index => $stage) {
                $alias = 'stage'.$index;
                $previous = $index ? ' AND events.created_at >= stage'.($index - 1).'.at' : '';
                $joins[] = " LEFT JOIN LATERAL (SELECT MIN(created_at) AS at FROM events WHERE events.actor_hash = sessions.actor_hash AND events.session_id = sessions.session_id AND event = '{$stage}'{$previous}) {$alias} ON true";
                $columns[] = "COUNT({$alias}.at) AS {$stage}";
            }
            $result = DB::selectOne($sql.implode(', ', $columns).' FROM sessions'.implode('', $joins), $query->getBindings());
            $funnel = array_map(function ($stage, $index) use ($result, $stages) {
                $count = (int) $result->{$stage};
                $previous = $index ? (int) $result->{$stages[$index - 1]} : null;
                return ['id' => $stage, 'sessions' => $count, 'rate' => $previous ? round($count / $previous * 100, 1) : null];
            }, $stages, array_keys($stages));
        }
        $assistantQuery = (clone $query)->where('source', 'assistant');
        $assistantAvailable = (clone $assistantQuery)->distinct()->count('actor_hash') >= $minimum;
        $assistant = [];
        foreach (['assistant_conversation', 'assistant_search', 'assistant_recommendations', 'assistant_click', 'booking_start', 'booking_confirmed'] as $event) {
            $count = null;
            if ($assistantAvailable) {
                $events = (clone $assistantQuery)->where('event', $event);
                $count = match ($event) {
                    'assistant_conversation' => $events->selectRaw("COUNT(DISTINCT actor_hash || ':' || COALESCE(conversation_id::text, session_id::text)) AS total")->value('total'),
                    'assistant_recommendations' => $events->sum('results_count'),
                    default => $events->count(),
                };
            }
            $assistant[] = ['id' => $event, 'value' => $count === null ? null : (int) $count];
        }
        $assistant[] = ['id' => 'zeroResults', 'value' => $assistantAvailable ? (clone $assistantQuery)->where('event', 'assistant_search')->where('results_count', 0)->count() : null];
        $searches = (clone $query)->whereIn('event', ['search', 'assistant_search']);
        $zero = (clone $searches)->where('results_count', 0)->whereNotNull('category_id')->selectRaw('category_id, COUNT(*) AS searches, COUNT(DISTINCT actor_hash) AS participants')->groupBy('category_id')->havingRaw('COUNT(DISTINCT actor_hash) >= ?', [$minimum])->orderByDesc('searches')->limit(20)->get();
        $names = DB::table('platform.business_categories')->whereIn('id', $zero->pluck('category_id'))->pluck('name', 'id');
        $serviceViews = (clone $query)->where('event', 'service_view')->whereNotNull('service_id')->selectRaw('service_id, COUNT(*) AS views, COUNT(DISTINCT actor_hash) AS participants')->groupBy('service_id')->havingRaw('COUNT(DISTINCT actor_hash) >= ?', [$minimum])->orderByDesc('views')->limit(20)->get();
        $serviceNames = DB::table('catalog.services')->whereIn('id', $serviceViews->pluck('service_id'))->pluck('name', 'id');
        $searched = (clone $searches)->whereNotNull('service_id')->selectRaw('service_id, COUNT(*) AS searches, COUNT(DISTINCT actor_hash) AS participants')
            ->groupBy('service_id')->havingRaw('COUNT(DISTINCT actor_hash) >= ?', [$minimum])->orderByDesc('searches')->limit(20)->get();
        $searchedNames = DB::table('catalog.services')->whereIn('id', $searched->pluck('service_id'))->pluck('name', 'id');
        $serviceConversion = $this->serviceConversion($query, $minimum);
        return [
            'conversion' => $available && $funnel[0]['sessions'] > 0 ? round($funnel[6]['sessions'] / $funnel[0]['sessions'] * 100, 1) : null,
            'serviceConversion' => $serviceConversion,
            'searchedServices' => $searched->map(fn ($row) => ['id' => (int) $row->service_id, 'name' => $searchedNames[$row->service_id] ?? 'Servicio archivado', 'value' => (int) $row->searches])->all(),
            'available' => $available, 'minimumGroup' => $minimum, 'funnel' => $funnel, 'assistantAvailable' => $assistantAvailable, 'assistant' => $assistant,
            'since' => DB::table('platform.marketplace_events')->min('created_at'), 'retentionDays' => (int) config('analytics.retention_days', 400),
            'zeroResults' => $available ? (clone $searches)->where('results_count', 0)->count() : null,
            'zeroResultCategories' => $zero->map(fn ($row) => ['id' => (int) $row->category_id, 'name' => $names[$row->category_id] ?? 'Categoría archivada', 'value' => (int) $row->searches])->all(),
            'viewedServices' => $serviceViews->map(fn ($row) => ['id' => (int) $row->service_id, 'name' => $serviceNames[$row->service_id] ?? 'Servicio archivado', 'value' => (int) $row->views])->all(),
        ];
    }
    private function serviceConversion(Builder $query, int $minimum): array
    {
        $rows = DB::select('WITH events AS ('.$query->toSql()."), views AS (
            SELECT actor_hash, session_id, service_id, MIN(created_at) AS at FROM events WHERE event = 'service_view' AND service_id IS NOT NULL GROUP BY actor_hash, session_id, service_id
        ) SELECT views.service_id, COUNT(*) AS views, COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM events WHERE events.actor_hash = views.actor_hash AND events.session_id = views.session_id AND events.service_id = views.service_id AND events.event = 'booking_confirmed' AND events.created_at >= views.at
        )) AS bookings FROM views GROUP BY views.service_id HAVING COUNT(DISTINCT views.actor_hash) >= ?", [...$query->getBindings(), $minimum]);
        return collect($rows)->map(fn ($row) => ['id' => (int) $row->service_id, 'views' => (int) $row->views, 'bookings' => (int) $row->bookings, 'rate' => round($row->bookings / $row->views * 100, 1)])->all();
    }
}
