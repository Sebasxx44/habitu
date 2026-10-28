<?php

declare(strict_types=1);

namespace App\Modules\Catalog\Services;

use App\Core\Support\Money;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\DynamicPricingRule;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

final class DynamicPricingService
{
    private array $rules = [];

    /** One deterministic rule; adjustment is applied to the resolved branch/duration/participants price before benefits. */
    public function evaluate(array $reservation): array
    {
        $businessId = (int) $reservation['business_id'];
        $serviceId = (int) $reservation['service_id'];
        $base = Money::minor($reservation['price']);
        $timezone = config('booking.timezone', 'America/Bogota');
        $date = CarbonImmutable::parse($reservation['date'].' '.($reservation['start_time'] ?? '00:00'), $timezone);
        $rules = $this->rules($businessId)->filter(fn ($rule) => (! $rule->service_id || (int) $rule->service_id === $serviceId) && $this->matches($rule, $date))
            ->sort(fn ($a, $b) => ((int) $b->priority <=> (int) $a->priority) ?: ((int) (bool) $b->service_id <=> (int) (bool) $a->service_id) ?: ($a->id <=> $b->id));
        $rule = $rules->first();
        $price = $base;
        if ($rule) {
            $multiplier = Money::minor($rule->multiplier);
            $adjustment = $this->signedMinor($rule->flat_adjustment ?? '0');
            $price = max(0, intdiv($base * $multiplier + 50, 100) + $adjustment);
        }
        if ($price > 9999999999) throw ValidationException::withMessages(['price' => 'La tarifa calculada supera el máximo de 99.999.999,99 permitido por reserva. Revisa la regla de precio.']);
        return [
            'base_price' => (float) Money::decimal($base), 'price' => (float) Money::decimal($price),
            'adjustment' => ($price - $base) / 100, 'currency' => $reservation['currency'] ?? 'COP', 'timezone' => $timezone,
            'rule' => $rule ? ['id' => $rule->id, 'name' => $rule->name ?: $rule->rule_type, 'rule_type' => $rule->rule_type,
                'priority' => (int) $rule->priority, 'multiplier' => (float) $rule->multiplier, 'flat_adjustment' => (float) ($rule->flat_adjustment ?? 0), 'updated_at' => $rule->updated_at?->toIso8601String()] : null,
        ];
    }

    private function rules(int $businessId): Collection
    {
        if (! array_key_exists($businessId, $this->rules)) {
            if (DB::transactionLevel() > 0) Business::whereKey($businessId)->lockForUpdate()->firstOrFail();
            // Global legacy rules and heuristic demand/weather rules never affect a tenant's price implicitly.
            $this->rules[$businessId] = DynamicPricingRule::where('business_id', $businessId)->where('is_active', true)
                ->whereIn('rule_type', ['PEAK_HOUR', 'DAY_OF_WEEK'])->get();
        }
        return $this->rules[$businessId];
    }

    public function supports(DynamicPricingRule $rule): bool
    {
        if (! in_array($rule->rule_type, ['PEAK_HOUR', 'DAY_OF_WEEK'], true)) return false;
        if ((float) $rule->multiplier < 0.1 || (float) $rule->multiplier > 5) return false;
        if (array_diff(array_keys($rule->conditions ?? []), ['days_of_week', 'day_of_week', 'time_start', 'time_end', 'hour_start', 'hour_end'])) return false;
        return true;
    }

    private function matches(DynamicPricingRule $rule, CarbonImmutable $date): bool
    {
        if (! $this->supports($rule)) return false;
        $local = $date->setTimezone($rule->timezone ?: config('booking.timezone'));
        if ($rule->starts_at && $date->lt($rule->starts_at)) return false;
        if ($rule->ends_at && $date->gt($rule->ends_at)) return false;
        $conditions = $rule->conditions ?? [];
        $days = $conditions['days_of_week'] ?? (isset($conditions['day_of_week']) ? [(int) $conditions['day_of_week']] : range(0, 6));
        if (! in_array($local->dayOfWeek, array_map('intval', $days), true)) return false;
        $start = $conditions['time_start'] ?? (isset($conditions['hour_start']) ? sprintf('%02d:00', $conditions['hour_start']) : '00:00');
        $end = $conditions['time_end'] ?? (isset($conditions['hour_end']) ? ((int) $conditions['hour_end'] >= 23 ? '23:59' : sprintf('%02d:00', (int) $conditions['hour_end'] + 1)) : '23:59');
        return $local->format('H:i') >= $start && $local->format('H:i') < $end;
    }

    private function signedMinor(float|int|string $amount): int
    {
        $value = (string) $amount;
        return str_starts_with($value, '-') ? -Money::minor(substr($value, 1)) : Money::minor($value);
    }
}
