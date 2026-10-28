<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Campaign;
use App\Modules\Booking\Models\Appointment;
use Illuminate\Database\Eloquent\Builder;

final class CampaignAnalyticsService
{
    public function stats(Campaign $campaign): array
    {
        $sent = $campaign->logs()->whereIn('status', ['SENT', 'OPENED', 'CLICKED'])->distinct('recipient_email')->count('recipient_email');
        $opened = $campaign->logs()->where(fn (Builder $query) => $query->whereNotNull('opened_at')->orWhereIn('status', ['OPENED', 'CLICKED']))
            ->distinct('recipient_email')->count('recipient_email');
        $clicked = $campaign->logs()->where(fn (Builder $query) => $query->whereNotNull('clicked_at')->orWhere('status', 'CLICKED'))
            ->distinct('recipient_email')->count('recipient_email');
        $total = max((int) $campaign->recipients_count, $campaign->logs()->distinct('recipient_email')->count('recipient_email'));
        return [
            'total_recipients' => $total, 'sent_success' => $sent,
            'failed' => $campaign->logs()->where('status', 'FAILED')->count(), 'opened' => $opened, 'clicked' => $clicked,
            'pending' => $campaign->logs()->whereIn('status', $campaign->status === 'PROCESSING' ? ['QUEUED', 'SENDING'] : ['QUEUED'])->count(),
            'skipped' => $campaign->logs()->where('status', 'SKIPPED')->count(),
            'uncertain' => $campaign->logs()->whereIn('status', $campaign->status === 'PROCESSING' ? ['UNCERTAIN'] : ['SENDING', 'UNCERTAIN'])->count(),
            'delivery_rate' => $this->rate($sent, $total), 'open_rate' => $this->rate($opened, $sent), 'click_rate' => $this->rate($clicked, $sent),
            'tracking_available' => true, 'logs' => $campaign->logs()->latest('id')->limit(100)->get(),
            'logs_total' => $campaign->logs()->count(), 'related_promotion' => $this->promotionStats($campaign),
            'daily' => $this->daily($campaign),
        ];
    }

    private function rate(int $count, int $total): float
    {
        return $total > 0 ? round(min(100, $count / $total * 100), 1) : 0;
    }

    private function promotionStats(Campaign $campaign): ?array
    {
        $promotion = $campaign->promotion;
        if (! $promotion || (int) $promotion->business_id !== (int) $campaign->business_id) return null;
        $appointmentIds = $promotion->usages()->whereNotNull('appointment_id')->select('appointment_id');
        return ['id' => $promotion->id, 'title' => $promotion->title, 'promo_code' => $promotion->promo_code,
            'redemptions' => $promotion->usages()->count(), 'savings' => (float) $promotion->usages()->sum('saved_amount'),
            'revenue' => (float) Appointment::where('business_id', $campaign->business_id)->where('status', 'COMPLETED')
                ->whereIn('id', $appointmentIds)->sum('final_price'), 'attribution' => 'promotion_total'];
    }

    private function daily(Campaign $campaign): array
    {
        $series = [];
        foreach (['sent' => 'sent_at', 'failed' => 'updated_at', 'opened' => 'opened_at', 'clicked' => 'clicked_at'] as $metric => $column) {
            $query = $campaign->logs()->whereNotNull($column);
            if ($metric === 'failed') $query->where('status', 'FAILED');
            if ($metric === 'sent') $query->whereIn('status', ['SENT', 'OPENED', 'CLICKED']);
            $rows = $query->selectRaw('DATE('.$column.') AS event_date, COUNT(DISTINCT recipient_email) AS total')
                ->groupByRaw('DATE('.$column.')')->orderBy('event_date')->get();
            foreach ($rows as $row) {
                $date = (string) $row->event_date;
                $series[$date] ??= ['date' => $date, 'sent' => 0, 'failed' => 0, 'opened' => 0, 'clicked' => 0];
                $series[$date][$metric] = (int) $row->total;
            }
        }
        ksort($series);
        return array_values($series);
    }
}
