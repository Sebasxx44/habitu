<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExecutivePDFGenerator
{
    /**
     * Generate an HTML-based executive report that can be printed/saved as PDF.
     */
    public function generateReport(int $businessId, string $startDate, string $endDate): string
    {
        $business = DB::table('business.businesses')->where('id', $businessId)->first();
        $businessName = $business->name ?? 'ElegantBarb';

        // Fetch appointment data
        $appointments = DB::table('booking.appointments')
            ->where('business_id', $businessId)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $total = $appointments->count();
        $completed = $appointments->where('status', 'COMPLETED')->count();
        $cancelled = $appointments->whereIn('status', ['CANCELLED', 'NO_SHOW'])->count();
        $revenue = $appointments->where('status', 'COMPLETED')->sum(fn($a) => $a->final_price ?? $a->price ?? 0);
        $avgTicket = $completed > 0 ? round($revenue / $completed) : 0;
        $completionRate = $total > 0 ? round(($completed / $total) * 100, 1) : 0;

        // Professional performance
        $professionals = DB::table('people.professionals')
            ->where('business_id', $businessId)
            ->get(['id', 'name']);

        $profStats = $professionals->map(function ($p) use ($appointments) {
            $profAppts = $appointments->where('professional_id', $p->id);
            $profCompleted = $profAppts->where('status', 'COMPLETED');
            return [
                'name' => $p->name,
                'total' => $profAppts->count(),
                'completed' => $profCompleted->count(),
                'revenue' => $profCompleted->sum(fn($a) => $a->final_price ?? $a->price ?? 0),
                'commission' => round($profCompleted->sum(fn($a) => ($a->final_price ?? $a->price ?? 0) * 0.3)),
            ];
        })->sortByDesc('revenue')->values();

        // Heatmap data (hour x day_of_week)
        $heatmap = [];
        for ($d = 0; $d < 7; $d++) {
            for ($h = 7; $h <= 21; $h++) {
                $heatmap[$d][$h] = 0;
            }
        }
        foreach ($appointments as $a) {
            $dayOfWeek = Carbon::parse($a->date)->dayOfWeek;
            $hour = (int) Carbon::parse($a->start_time)->format('H');
            if (isset($heatmap[$dayOfWeek][$hour])) {
                $heatmap[$dayOfWeek][$hour]++;
            }
        }

        // Cohort retention (30, 60, 90 days)
        $retention30 = $this->calculateRetention($businessId, 30);
        $retention60 = $this->calculateRetention($businessId, 60);
        $retention90 = $this->calculateRetention($businessId, 90);

        $dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        $now = Carbon::now()->format('d/m/Y H:i');

        // Build HTML
        $html = $this->renderHTML(
            $businessName, $startDate, $endDate, $now,
            $total, $completed, $cancelled, $revenue, $avgTicket, $completionRate,
            $profStats, $heatmap, $dayNames,
            $retention30, $retention60, $retention90
        );

        return $html;
    }

    private function calculateRetention(int $businessId, int $days): float
    {
        $cutoff = now()->subDays($days)->format('Y-m-d');
        $allClients = DB::table('booking.appointments')
            ->where('business_id', $businessId)
            ->where('date', '<=', $cutoff)
            ->distinct('client_id')
            ->count('client_id');

        if ($allClients === 0) return 0;

        $returning = DB::table('booking.appointments')
            ->where('business_id', $businessId)
            ->where('date', '>', $cutoff)
            ->whereIn('client_id', function ($q) use ($businessId, $cutoff) {
                $q->select('client_id')
                    ->from('booking.appointments')
                    ->where('business_id', $businessId)
                    ->where('date', '<=', $cutoff);
            })
            ->distinct('client_id')
            ->count('client_id');

        return round(($returning / $allClients) * 100, 1);
    }

    private function renderHTML(
        string $businessName, string $startDate, string $endDate, string $now,
        int $total, int $completed, int $cancelled, float $revenue, float $avgTicket, float $completionRate,
        $profStats, array $heatmap, array $dayNames,
        float $retention30, float $retention60, float $retention90
    ): string {
        $profRows = '';
        foreach ($profStats as $p) {
            $profRows .= "<tr><td>{$p['name']}</td><td>{$p['total']}</td><td>{$p['completed']}</td><td>\$" . number_format($p['revenue']) . "</td><td>\$" . number_format($p['commission']) . "</td></tr>";
        }

        $heatmapRows = '';
        $maxVal = 1;
        foreach ($heatmap as $d => $hours) {
            foreach ($hours as $count) {
                $maxVal = max($maxVal, $count);
            }
        }
        for ($h = 7; $h <= 21; $h++) {
            $heatmapRows .= "<tr><td style='font-weight:bold;'>{$h}:00</td>";
            for ($d = 0; $d < 7; $d++) {
                $val = $heatmap[$d][$h] ?? 0;
                $intensity = $maxVal > 0 ? round(($val / $maxVal) * 100) : 0;
                $bg = $intensity > 70 ? '#dc2626' : ($intensity > 40 ? '#f59e0b' : ($intensity > 10 ? '#22c55e' : '#f1f5f9'));
                $color = $intensity > 40 ? '#fff' : '#333';
                $heatmapRows .= "<td style='background:{$bg};color:{$color};text-align:center;font-weight:bold;'>{$val}</td>";
            }
            $heatmapRows .= '</tr>';
        }

        $revenueFormatted = '$' . number_format($revenue);
        $avgTicketFormatted = '$' . number_format($avgTicket);

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Ejecutivo - {$businessName}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 30px 40px; border-radius: 16px; margin-bottom: 30px; }
  .header h1 { margin: 0; font-size: 28px; letter-spacing: -1px; }
  .header p { margin: 5px 0 0; opacity: 0.7; font-size: 13px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
  .kpi .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 700; }
  .kpi .value { font-size: 32px; font-weight: 900; color: #0f172a; margin: 8px 0 0; }
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 18px; font-weight: 800; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0f172a; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .retention-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .retention-card { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; }
  .retention-card .days { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #16a34a; letter-spacing: 2px; }
  .retention-card .rate { font-size: 36px; font-weight: 900; color: #15803d; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
  @media print { body { padding: 0; } .header { border-radius: 0; } }
</style>
</head>
<body>
<div class="header">
  <h1>📊 {$businessName} — Reporte Ejecutivo BI</h1>
  <p>Periodo: {$startDate} al {$endDate} · Generado: {$now}</p>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="label">Ingresos Totales</div><div class="value">{$revenueFormatted}</div></div>
  <div class="kpi"><div class="label">Ticket Promedio</div><div class="value">{$avgTicketFormatted}</div></div>
  <div class="kpi"><div class="label">Tasa de Efectividad</div><div class="value">{$completionRate}%</div></div>
  <div class="kpi"><div class="label">Citas Totales</div><div class="value">{$total}</div></div>
  <div class="kpi"><div class="label">Completadas</div><div class="value">{$completed}</div></div>
  <div class="kpi"><div class="label">Canceladas / No-Show</div><div class="value">{$cancelled}</div></div>
</div>

<div class="section">
  <h2>🏆 Rendimiento por Profesional</h2>
  <table>
    <thead><tr><th>Profesional</th><th>Citas</th><th>Completadas</th><th>Ingresos</th><th>Comisión</th></tr></thead>
    <tbody>{$profRows}</tbody>
  </table>
</div>

<div class="section">
  <h2>🔥 Mapa Térmico de Horas Pico</h2>
  <table>
    <thead><tr><th>Hora</th><th>{$dayNames[0]}</th><th>{$dayNames[1]}</th><th>{$dayNames[2]}</th><th>{$dayNames[3]}</th><th>{$dayNames[4]}</th><th>{$dayNames[5]}</th><th>{$dayNames[6]}</th></tr></thead>
    <tbody>{$heatmapRows}</tbody>
  </table>
</div>

<div class="section">
  <h2>📈 Retención de Clientes por Cohorte</h2>
  <div class="retention-grid">
    <div class="retention-card"><div class="days">30 días</div><div class="rate">{$retention30}%</div></div>
    <div class="retention-card"><div class="days">60 días</div><div class="rate">{$retention60}%</div></div>
    <div class="retention-card"><div class="days">90 días</div><div class="rate">{$retention90}%</div></div>
  </div>
</div>

<div class="footer">
  <p>Generado automáticamente por ElegantBarb · Advanced Business Intelligence Engine</p>
</div>
</body>
</html>
HTML;
    }
}
