<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class DashboardMetrics
{
    public function totals(Builder $scope, string $start, string $end, string $currency): array
    {
        $totals = (clone $scope)->whereBetween('date', [$start, $end])->selectRaw(
            "COUNT(*) AS appointments,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed,
            COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled,
            COUNT(DISTINCT client_id) AS clients,
            COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND currency = ? THEN final_price ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND currency = ? THEN final_price ELSE 0 END), 0) AS spent",
            [$currency, $currency]
        )->first();

        $count = (int) $totals->appointments;
        return [
            'appointments' => $count,
            'completed' => (int) $totals->completed,
            'cancelled' => (int) $totals->cancelled,
            'clients' => (int) $totals->clients,
            'revenue' => (float) $totals->revenue,
            'spent' => (float) $totals->spent,
            'cancellationRate' => $count > 0 ? round((int) $totals->cancelled / $count * 100, 1) : 0,
        ];
    }

    public function cards(User $user, array $current, array $previous, int $today, int $yesterday, int $upcoming, array $loyalty): array
    {
        $period = 'Comparado con el período anterior de igual duración.';
        return match ($user->role) {
            User::ROLE_CLIENT => [
                $this->metric('upcoming', 'Próximas citas', $upcoming, null, 'count', 'Reservas pendientes o confirmadas a partir de ahora.'),
                $this->metric('completed', 'Experiencias completadas', $current['completed'], $previous['completed'], 'count', $period),
                $this->metric('spent', 'Pagado en el período', $current['spent'], $previous['spent'], 'currency', 'Citas con pago registrado como PAID en la moneda indicada.'),
                $this->metric('rewards', 'Recompensas disponibles', $loyalty['rewards'], null, 'count', 'Beneficios de programas activos y vigentes.'),
            ],
            User::ROLE_PROFESSIONAL => [
                $this->metric('today', 'Citas de hoy', $today, $yesterday, 'count', 'Todas tus citas de hoy; comparación con ayer.'),
                $this->metric('completed', 'Servicios completados', $current['completed'], $previous['completed'], 'count', $period),
                $this->metric('clients', 'Clientes del período', $current['clients'], $previous['clients'], 'count', 'Clientes distintos con citas en el período.'),
                $this->metric('cancellations', 'Cancelaciones', $current['cancellationRate'], $previous['cancellationRate'], 'percent', 'Porcentaje de citas canceladas en el período.'),
            ],
            default => [
                $this->metric('today', 'Citas de hoy', $today, $yesterday, 'count', 'Todas las citas de hoy; comparación con ayer.'),
                $this->metric('revenue', 'Valor de servicios realizados', $current['revenue'], $previous['revenue'], 'currency', 'Valor final de citas completadas en la moneda indicada. No equivale a cobros recibidos.'),
                $this->metric('completed', 'Citas completadas', $current['completed'], $previous['completed'], 'count', $period),
                $this->metric('cancellations', 'Cancelaciones', $current['cancellationRate'], $previous['cancellationRate'], 'percent', 'Porcentaje de citas canceladas en el período.'),
            ],
        };
    }

    public function series(Builder $scope, CarbonImmutable $start, CarbonImmutable $end, string $currency): array
    {
        $rows = (clone $scope)->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw("date, COUNT(*) AS appointments,
                COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed,
                COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled,
                COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND currency = ? THEN final_price ELSE 0 END), 0) AS revenue", [$currency])
            ->groupBy('date')->orderBy('date')->get()
            ->keyBy(fn ($row) => $row->date->toDateString());

        return collect(range(0, (int) $start->diffInDays($end)))->map(fn (int $offset) => [
            'date' => $date = $start->addDays($offset)->toDateString(),
            'appointments' => (int) ($rows->get($date)?->appointments ?? 0),
            'completed' => (int) ($rows->get($date)?->completed ?? 0),
            'cancelled' => (int) ($rows->get($date)?->cancelled ?? 0),
            'revenue' => (float) ($rows->get($date)?->revenue ?? 0),
        ])->all();
    }

    private function metric(string $id, string $label, float $value, ?float $previous, string $unit, string $description): array
    {
        $change = $previous !== null && $previous > 0 ? round(($value - $previous) / $previous * 100, 1) : null;
        return compact('id', 'label', 'value', 'unit', 'previous', 'change', 'description');
    }
}
