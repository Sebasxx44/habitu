<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Platform\Models\Notification;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class DashboardOverviewService
{
    public function __construct(private DashboardScope $scope, private DashboardMetrics $metrics) {}

    public function overview(User $user, int|AnalyticsPeriod $period, ?string $requestedCurrency = null): array
    {
        $timezone = config('booking.timezone', 'America/Bogota');
        $now = CarbonImmutable::now($timezone);
        $period = is_int($period) ? new AnalyticsPeriod(['days' => $period]) : $period;
        $end = $period->end;
        $start = $period->start;
        $previousEnd = $period->previousEnd;
        $previousStart = $period->previousStart;
        $query = $this->scope->appointments($user);
        $currencies = (clone $query)->whereBetween('date', [$previousStart->toDateString(), $end->toDateString()])
            ->distinct()->orderBy('currency')->pluck('currency')->all();
        $currency = $requestedCurrency ?? (in_array('COP', $currencies, true) ? 'COP' : ($currencies[0] ?? 'COP'));
        $current = $this->metrics->totals($query, $start->toDateString(), $end->toDateString(), $currency);
        $previous = $this->metrics->totals($query, $previousStart->toDateString(), $previousEnd->toDateString(), $currency);
        $today = (clone $query)->where('date', $now->toDateString())->count();
        $yesterday = (clone $query)->where('date', $now->subDay()->toDateString())->count();
        $upcoming = (clone $query)->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])
            ->where(fn (Builder $dates) => $dates->where('date', '>', $now->toDateString())
                ->orWhere(fn (Builder $todayQuery) => $todayQuery->where('date', $now->toDateString())->where('end_time', '>', $now->format('H:i:s'))));
        $loyalty = $this->loyalty($user, $now->toDateString());

        return [
            'role' => $user->role,
            'scopeName' => $this->scope->name($user),
            'generatedAt' => $now->toIso8601String(),
            'timezone' => $timezone,
            'period' => $period->toArray(),
            'currency' => $currency,
            'currencies' => $currencies,
            'metrics' => $this->metrics->cards($user, $current, $previous, $today, $yesterday, (clone $upcoming)->count(), $loyalty),
            'series' => $this->metrics->series($query, $start, $end, $currency),
            'statuses' => (clone $query)->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->selectRaw('status, COUNT(*) AS count')->groupBy('status')->orderBy('status')->get()
                ->map(fn ($row) => ['status' => $row->getRawOriginal('status'), 'count' => (int) $row->count])->all(),
            'services' => (clone $query)->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                ->selectRaw("service_id, COUNT(*) AS appointments,
                    COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND currency = ? THEN final_price ELSE 0 END), 0) AS revenue", [$currency])
                ->with('service:id,name')->groupBy('service_id')->orderByDesc('appointments')->limit(5)->get()
                ->map(fn ($row) => ['id' => (int) $row->service_id, 'name' => $row->service?->name ?? 'Servicio archivado',
                    'appointments' => (int) $row->appointments, 'revenue' => (float) $row->revenue])->all(),
            'upcoming' => (clone $upcoming)->with(['client:id,name', 'professional:id,name', 'service:id,name', 'business:id,name'])
                ->orderBy('date')->orderBy('start_time')->orderBy('id')->limit(6)->get()->map(fn (Appointment $appointment) => [
                    'id' => $appointment->id, 'bookingCode' => $appointment->booking_code,
                    'date' => $appointment->date->toDateString(),
                    'startTime' => substr($appointment->getRawOriginal('start_time'), 0, 5),
                    'endTime' => substr($appointment->getRawOriginal('end_time'), 0, 5),
                    'status' => $appointment->getRawOriginal('status'),
                    'client' => $appointment->client?->name ?? 'Cliente archivado',
                    'professional' => $appointment->professional?->name,
                    'service' => $appointment->service?->name ?? 'Servicio archivado',
                    'business' => $appointment->business?->name ?? 'Negocio archivado',
                    'price' => (float) $appointment->final_price, 'currency' => $appointment->currency,
                ])->all(),
            'loyalty' => $loyalty,
            'notices' => Notification::where('user_id', $user->id)->latest()->limit(4)->get()
                ->map(fn (Notification $notice) => ['id' => $notice->id, 'title' => $notice->title,
                    'message' => $notice->message, 'read' => $notice->read, 'createdAt' => $notice->created_at->toIso8601String()])->all(),
        ];
    }

    private function loyalty(User $user, string $today): array
    {
        if ($user->role !== User::ROLE_CLIENT) {
            return ['points' => 0, 'rewards' => 0, 'cards' => []];
        }
        $clients = $this->scope->clients($user);
        $cards = LoyaltyCard::whereIn('client_id', (clone $clients)->select('id'))->where('status', 'ACTIVE')
            ->whereHas('program', fn (Builder $program) => $program->where('active', true)
                ->where(fn (Builder $expiry) => $expiry->whereNull('valid_until')->orWhere('valid_until', '>=', $today)))
            ->with(['program.business:id,name'])->orderByDesc('reward_available')->orderByDesc('current_stamps')->get();

        return [
            'points' => (int) (clone $clients)->sum('loyalty_points'),
            'rewards' => $cards->where('reward_available', true)->count(),
            'cards' => $cards->take(6)->map(fn (LoyaltyCard $card) => [
                'id' => $card->id, 'business' => $card->program?->business?->name ?? 'Negocio archivado',
                'name' => $card->program->name, 'stamps' => $card->current_stamps,
                'required' => $card->program->stamps_required, 'reward' => $card->program->reward_description,
                'available' => $card->reward_available,
            ])->values()->all(),
        ];
    }
}
