<?php

namespace App\Modules\Analytics\Services;

use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class MarketplaceHealth
{
    public function overview(AnalyticsPeriod $period, ?int $businessId, array $filters): array
    {
        $base = $this->scope($businessId, $filters)->where('a.currency', $period->currency);
        $window = fn (Builder $query) => $query->whereBetween('a.date', [$period->start->toDateString(), $period->end->toDateString()]);
        $all = $window(clone $base)->count();
        $base->where('b.analytics_environment', 'PRODUCTION')->where(fn ($query) => $query->whereNull('a.source')->orWhereNotIn(DB::raw('LOWER(a.source)'), ['demo', 'test']));
        $base->whereNotExists(fn ($query) => $query->selectRaw('1')->from('finance.checkout_orders as sandbox')->where('sandbox.purpose', 'reservation')->whereColumn('sandbox.target_id', 'a.id')->where('sandbox.environment', 'test'));
        $query = $window(clone $base);
        $sample = $query->count();
        $minimum = (int) config('analytics.minimum_group', 5);
        $suppressed = ! empty($filters) && (clone $query)->distinct()->count('a.client_id') < $minimum;
        $matured = (clone $query)->whereRaw('(a.date + a.end_time) AT TIME ZONE ? <= ?', [config('booking.timezone'), CarbonImmutable::now('UTC')->format('Y-m-d H:i:sP')]);
        $denominator = $matured->count(); $completed = (clone $matured)->where('a.status', 'COMPLETED')->count();
        $cancelled = (clone $query)->where('a.status', 'CANCELLED')->count();
        return ['period' => $period->toArray(), 'currency' => $period->currency, 'timezone' => config('booking.timezone'), 'generated_at' => now()->toIso8601String(),
            'sample' => $suppressed ? null : $sample, 'excluded' => $suppressed ? null : $all - $sample, 'minimum_group' => $minimum, 'suppressed' => $suppressed,
            'metrics' => $suppressed ? [] : [
                ['id' => 'fulfilment', 'numerator' => $completed, 'denominator' => $denominator, 'value' => $denominator ? round($completed * 100 / $denominator, 2) : null, 'unit' => 'percent', 'source' => 'booking.appointments'],
                ['id' => 'cancelRate', 'numerator' => $cancelled, 'denominator' => $sample, 'value' => $sample ? round($cancelled * 100 / $sample, 2) : null, 'unit' => 'percent', 'source' => 'booking.appointments'],
                ['id' => 'reservedValue', 'numerator' => null, 'denominator' => (clone $query)->whereNotIn('a.status', ['CANCELLED', 'NO_SHOW'])->count(), 'value' => (float) (clone $query)->whereNotIn('a.status', ['CANCELLED', 'NO_SHOW'])->sum('a.final_price'), 'unit' => 'currency', 'source' => 'booking.appointments.final_price'],
            ],
            'modalities' => $suppressed ? [] : (clone $matured)->selectRaw("COALESCE(a.booking_model, 'legacy') AS modality, COUNT(*) AS denominator, COUNT(*) FILTER (WHERE a.status = 'COMPLETED') AS numerator")
                ->groupBy('a.booking_model')->get()->map(fn ($row) => ['modality' => $row->modality, 'numerator' => (int) $row->numerator, 'denominator' => (int) $row->denominator])->all(),
            'cancellations' => $suppressed ? [] : $this->cancellations($query),
            'cohorts' => $suppressed ? [] : $this->cohorts($base, $period, $minimum),
            'finance' => $suppressed ? null : $this->finance($query, $period),
            'quality' => $suppressed ? null : $this->quality($query, $sample),
            'limitations' => ['explicitClassification', 'appointmentDateBasis', 'currentActorRole', 'noHistoricalCapacity', 'noTransferConfirmation', 'noCostMargin', 'searchTimingUnavailable', 'businessLocationOnly'],
        ];
    }

    private function scope(?int $businessId, array $filters): Builder
    {
        return DB::table('booking.appointments as a')->join('business.businesses as b', 'b.id', '=', 'a.business_id')->join('business.business_branches as branch', 'branch.id', '=', 'a.branch_id')
            ->whereNull('a.deleted_at')->whereNull('b.deleted_at')->when($businessId, fn ($query) => $query->where('a.business_id', $businessId))
            ->when($filters['category_id'] ?? null, fn ($query, $id) => $query->where('b.business_category_id', $id))
            ->when($filters['city_id'] ?? null, fn ($query, $id) => $query->where('branch.city_id', $id))
            ->when(isset($filters['hour']), fn ($query) => $query->whereRaw('EXTRACT(HOUR FROM a.start_time) = ?', [$filters['hour']]));
    }

    private function cancellations(Builder $query): array
    {
        $latest = DB::table('booking.appointment_cancellations')->selectRaw('appointment_id, MAX(id) AS id')->groupBy('appointment_id');
        $rows = (clone $query)->where('a.status', 'CANCELLED')->leftJoinSub($latest, 'last_cancel', fn ($join) => $join->on('last_cancel.appointment_id', '=', 'a.id'))
            ->leftJoin('booking.appointment_cancellations as cancel', 'cancel.id', '=', 'last_cancel.id')->leftJoin('users as actor', 'actor.id', '=', 'cancel.cancelled_by_id')
            ->selectRaw("CASE WHEN cancel.cancelled_by_type = 'SYSTEM' THEN 'system' WHEN actor.role = 'CLIENTE' THEN 'client' WHEN actor.role IN ('ADMIN_BARBERIA', 'PROFESSIONAL', 'BARBERO', 'PROFESIONAL') THEN 'provider' ELSE 'other' END AS responsible, COUNT(*) AS count")
            ->groupBy('responsible')->get();
        return $rows->map(fn ($row) => ['responsible' => $row->responsible, 'count' => (int) $row->count])->all();
    }

    private function cohorts(Builder $base, AnalyticsPeriod $period, int $minimum): array
    {
        $completed = (clone $base)->join('people.clients as c', 'c.id', '=', 'a.client_id')->where('a.status', 'COMPLETED')
            ->selectRaw("COALESCE('user:' || c.user_id::text, 'client:' || c.id::text) AS client_key, a.date");
        $first = DB::query()->fromSub($completed, 'completed')->selectRaw('client_key, MIN(date) AS first_date')->groupBy('client_key');
        $clients = DB::query()->fromSub($first, 'first')->whereBetween('first_date', [$period->start->toDateString(), $period->end->toDateString()])
            ->selectRaw("TO_CHAR(first_date, 'YYYY-MM') AS cohort, COUNT(*) AS sample, COUNT(*) FILTER (WHERE first_date <= ?::date - 30) AS eligible", [CarbonImmutable::now(config('booking.timezone'))->toDateString()])
            ->selectRaw('COUNT(*) FILTER (WHERE first_date <= ?::date - 30 AND EXISTS (SELECT 1 FROM ('.$completed->toSql().') repeated WHERE repeated.client_key = first.client_key AND repeated.date > first.first_date AND repeated.date <= first.first_date + 30)) AS returned', [CarbonImmutable::now(config('booking.timezone'))->toDateString(), ...$completed->getBindings()])
            ->groupBy('cohort')->orderBy('cohort')->get();
        return $clients->map(fn ($row) => ['month' => $row->cohort, 'sample' => (int) $row->sample >= $minimum ? (int) $row->sample : null,
            'eligible' => (int) $row->eligible >= $minimum ? (int) $row->eligible : null, 'returned' => (int) $row->eligible >= $minimum ? (int) $row->returned : null,
            'rate' => (int) $row->eligible >= $minimum ? round($row->returned * 100 / $row->eligible, 2) : null])->all();
    }

    private function finance(Builder $query, AnalyticsPeriod $period): array
    {
        $ids = (clone $query)->select('a.id');
        $orders = DB::table('finance.checkout_orders')->where('purpose', 'reservation')->where('environment', 'prod')->where('currency', $period->currency)->whereIn('target_id', $ids);
        $settled = (clone $orders)->whereIn('status', ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'])->count();
        $approved = (clone $orders)->where('status', 'APPROVED')->count();
        $refunds = DB::table('finance.checkout_refunds')->where('currency', $period->currency)->whereIn('checkout_order_id', (clone $orders)->select('id'));
        $payouts = DB::table('finance.professional_payouts')->whereIn('business_id', (clone $query)->select('a.business_id'))->whereBetween('period_end', [$period->start->toDateString(), $period->end->toDateString()]);
        return [
            'approval' => ['numerator' => $approved, 'denominator' => $settled, 'rate' => $settled ? round($approved * 100 / $settled, 2) : null],
            'collected' => (float) DB::table('finance.payments')->whereIn('appointment_id', $ids)->where('currency', $period->currency)->where('status', 'COMPLETED')->sum('amount'),
            'aged_pending' => (clone $orders)->where('status', 'PENDING')->where('created_at', '<=', now()->subDay())->count(),
            'unreconciled' => (clone $orders)->where('status', 'APPROVED')->whereNull('credited_at')->count(),
            'refund_pending' => (clone $refunds)->whereIn('status', ['REQUESTED', 'PROCESSING'])->count(),
            'refunded' => (float) (clone $refunds)->where('status', 'COMPLETED')->sum('amount_in_cents') / 100,
            'refund_failed' => (clone $refunds)->where('status', 'FAILED')->count(),
            'payout_pending' => (clone $payouts)->whereIn('status', ['PENDING', 'IN_REVIEW'])->count(),
            'payout_failed' => (clone $payouts)->where('status', 'FAILED')->count(),
            'payout_currency_available' => false, 'provider_confirmation_available' => false,
            'source' => 'finance.checkout_orders, payments, checkout_refunds, professional_payouts',
        ];
    }

    private function quality(Builder $query, int $sample): array
    {
        $incidents = DB::table('booking.reservation_incidents')->where('reservation_kind', 'appointment')->whereIn('reservation_id', (clone $query)->select('a.id'));
        $affected = (clone $incidents)->distinct()->count('reservation_id');
        $resolved = (clone $incidents)->whereNotNull('resolved_at')->whereColumn('resolved_at', '>=', 'created_at')
            ->selectRaw('COUNT(*) AS count, AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS hours')->first();
        return ['affected' => $affected, 'denominator' => $sample, 'rate' => $sample ? round($affected * 100 / $sample, 2) : null,
            'resolved' => (int) $resolved->count, 'mean_resolution_hours' => $resolved->hours !== null ? round((float) $resolved->hours, 2) : null,
            'source' => 'booking.reservation_incidents'];
    }
}
