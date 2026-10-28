<?php

namespace App\Modules\Analytics\Services;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class AnalyticsPeriod
{
    public readonly CarbonImmutable $start;
    public readonly CarbonImmutable $end;
    public readonly CarbonImmutable $previousStart;
    public readonly CarbonImmutable $previousEnd;
    public readonly int $days;
    public readonly string $currency;
    public readonly string $grain;

    public function __construct(array $filters)
    {
        $today = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'))->startOfDay();
        $this->end = isset($filters['end_date']) ? CarbonImmutable::parse($filters['end_date'], $today->timezone) : $today;
        $this->start = isset($filters['start_date']) ? CarbonImmutable::parse($filters['start_date'], $today->timezone) : $this->end->subDays(((int) ($filters['days'] ?? 30)) - 1);
        if ($this->end->lessThan($this->start) || $this->end->greaterThan($today) || $this->start->diffInDays($this->end) >= 366) {
            throw ValidationException::withMessages(['period' => 'Elige un período de hasta 366 días que termine hoy o antes.']);
        }
        $this->days = (int) $this->start->diffInDays($this->end) + 1;
        $this->previousEnd = $this->start->subDay();
        $this->previousStart = $this->start->subDays($this->days);
        $this->currency = $filters['currency'] ?? 'COP';
        $this->grain = $filters['grain'] ?? 'day';
    }

    public static function fromRequest(Request $request): self
    {
        return new self($request->validate([
            'days' => ['sometimes', 'integer', 'between:1,366'],
            'start_date' => ['required_with:end_date', 'date_format:Y-m-d'],
            'end_date' => ['required_with:start_date', 'date_format:Y-m-d'],
            'currency' => ['sometimes', 'regex:/^[A-Z]{3}$/'],
            'grain' => ['sometimes', 'in:day,week,month,quarter,year'],
        ]));
    }

    public function toArray(): array
    {
        return ['start' => $this->start->toDateString(), 'end' => $this->end->toDateString(), 'days' => $this->days,
            'previousStart' => $this->previousStart->toDateString(), 'previousEnd' => $this->previousEnd->toDateString(), 'grain' => $this->grain];
    }

    public function bucket(CarbonImmutable $date): string
    {
        return match ($this->grain) {
            'week' => $date->startOfWeek()->toDateString(), 'month' => $date->startOfMonth()->toDateString(),
            'quarter' => $date->firstOfQuarter()->toDateString(), 'year' => $date->startOfYear()->toDateString(),
            default => $date->toDateString(),
        };
    }
}
