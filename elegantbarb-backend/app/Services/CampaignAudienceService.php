<?php

declare(strict_types=1);

namespace App\Services;

use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Subscriptions\Models\ClientMembership;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class CampaignAudienceService
{
    public function query(int $businessId, string $targetRole, ?array $targetIds = null, array $segment = []): Builder
    {
        $query = ($targetRole === 'CLIENTE' ? Client::query() : Professional::query())
            ->where('business_id', $businessId)
            ->when($targetIds, fn (Builder $query) => $query->whereIn('id', $targetIds));
        if ($targetRole !== 'CLIENTE') return $query->where('is_active', true);

        $today = now(config('booking.timezone'))->startOfDay();
        $this->applyComparison($query, $segment, 'age_min', fn (Builder $query, int $age) => $query->whereDate('birthdate', '<=', $today->copy()->subYears($age)));
        $this->applyComparison($query, $segment, 'age_max', fn (Builder $query, int $age) => $query->whereDate('birthdate', '>', $today->copy()->subYears($age + 1)));
        $this->applyComparison($query, $segment, 'birthday_month', fn (Builder $query, int $month) => $query->whereMonth('birthdate', $month));
        if (isset($segment['tier'])) $query->whereRaw('LOWER(tier) = ?', [mb_strtolower($segment['tier'])]);
        if (isset($segment['is_vip'])) $query->where('is_vip', filter_var($segment['is_vip'], FILTER_VALIDATE_BOOLEAN));
        if (isset($segment['joined_after'])) $query->whereDate('created_at', '>=', $segment['joined_after']);
        if (isset($segment['joined_before'])) $query->whereDate('created_at', '<=', $segment['joined_before']);

        $completed = fn (Builder $visits) => $visits->where('business_id', $businessId)->where('status', 'COMPLETED');
        $this->applyComparison($query, $segment, 'min_visits', fn (Builder $query, int $count) => $query->whereHas('appointments', $completed, '>=', $count));
        $this->applyComparison($query, $segment, 'max_visits', fn (Builder $query, int $count) => $query->whereHas('appointments', $completed, '<=', $count));
        $this->applyComparison($query, $segment, 'inactive_days', fn (Builder $query, int $days) => $query->whereDoesntHave('appointments',
            fn (Builder $visits) => $completed($visits)->whereDate('date', '>=', $today->copy()->subDays($days))));
        if (isset($segment['has_membership'])) {
            $memberships = ClientMembership::query()->select('client_id')->where('status', 'ACTIVE')
                ->where('starts_at', '<=', now())->where('ends_at', '>', now())
                ->whereHas('plan', fn (Builder $plans) => $plans->where('business_id', $businessId));
            filter_var($segment['has_membership'], FILTER_VALIDATE_BOOLEAN)
                ? $query->whereIn('id', $memberships) : $query->whereNotIn('id', $memberships);
        }
        return $query;
    }

    public function recipients(int $businessId, string $targetRole, ?array $targetIds = null, array $segment = []): Collection
    {
        $suppressed = \Illuminate\Support\Facades\DB::table('marketing.campaign_suppressions')
            ->where('business_id', $businessId)->pluck('email')->flip();
        return $this->query($businessId, $targetRole, $targetIds, $segment)
            ->with('user:id,preferences')->orderBy('id')->get(['id', 'name', 'email', 'user_id'])
            ->filter(fn ($recipient) => filter_var(trim((string) $recipient->email), FILTER_VALIDATE_EMAIL)
                && \App\Modules\Accounts\Services\AccountPreferences::allows($recipient->user, 'email_notifications')
                && ! $suppressed->has(mb_strtolower(trim($recipient->email))))
            ->unique(fn ($recipient) => mb_strtolower(trim($recipient->email)))->values();
    }

    public function preview(int $businessId, string $targetRole, ?array $targetIds, array $segment): array
    {
        $recipients = $this->recipients($businessId, $targetRole, $targetIds, $segment);
        $matching = $this->query($businessId, $targetRole, $targetIds, $segment)->count();
        return [
            'total_recipients' => $recipients->count(),
            'recipients' => $recipients->take(50)->map(fn ($recipient) => $recipient->only(['id', 'name', 'email']))->values(),
            'summary' => ['matching' => $matching, 'excluded' => $matching - $recipients->count(), 'preview_limit' => 50],
        ];
    }

    private function applyComparison(Builder $query, array $segment, string $key, \Closure $filter): void
    {
        if (isset($segment[$key])) $filter($query, (int) $segment[$key]);
    }
}
