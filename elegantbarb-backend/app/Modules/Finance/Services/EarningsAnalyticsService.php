<?php

namespace App\Modules\Finance\Services;

use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\DB;

final class EarningsAnalyticsService
{
    public function overview(int $professionalId, ?int $walletId, AnalyticsPeriod $period): array
    {
        $start = $period->start->utc()->toDateTimeString();
        $end = $period->end->addDay()->utc()->toDateTimeString();
        $transactions = DB::table('finance.wallet_transactions')->where('wallet_id', $walletId ?? 0)
            ->where('created_at', '>=', $start)->where('created_at', '<', $end);
        $payouts = (clone $transactions)->where('type', 'PAYOUT')->where('status', 'COMPLETED');
        $services = Appointment::where('professional_id', $professionalId)->where('status', 'COMPLETED')
            ->whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()]);
        $dailyEarnings = (clone $payouts)
            ->selectRaw("(created_at AT TIME ZONE 'UTC' AT TIME ZONE ?)::date AS date, SUM(amount) AS earnings", [$period->start->timezoneName])
            ->groupByRaw('1')->get()->keyBy('date');
        $dailyServices = (clone $services)->selectRaw('date, COUNT(*) AS total')->groupBy('date')->get()->keyBy(fn ($row) => $row->date->toDateString());
        $rating = DB::table('reviews.reviews')->where('professional_id', $professionalId)
            ->where('is_active', true)->where('created_at', '>=', $start)->where('created_at', '<', $end)->avg('rating');

        return [
            'period' => $period->toArray(),
            'period_earnings' => (float) (clone $payouts)->sum('amount'),
            'period_completed_services' => (clone $services)->count(),
            'period_rating' => $rating === null ? null : round((float) $rating, 1),
            'series' => collect(range(0, $period->days - 1))->map(fn (int $offset) => [
                'date' => $date = $period->start->addDays($offset)->toDateString(),
                'earnings' => (float) ($dailyEarnings->get($date)?->earnings ?? 0),
                'completed_services' => (int) ($dailyServices->get($date)?->total ?? 0),
            ])->all(),
            'recent_transactions' => (clone $transactions)->orderByDesc('created_at')->orderByDesc('id')->limit(20)->get(),
        ];
    }
}
