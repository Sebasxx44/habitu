<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Interfaces\Services\ReportServiceInterface;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportServiceInterface $service) {}

    public function getDetailedReport(Request $request)
    {
        return response()->json($this->report($request))->header('Cache-Control', 'private, no-store');
    }

    public function downloadBIPDF(Request $request)
    {
        abort_unless($request->user()->hasEffectivePermission('reports.export'), 403);
        $data = $this->report($request);
        $title = e($data['shop']['name'] ?? 'Reporte de negocios');
        $currency = e($data['currency']);
        $rows = $data['records']->map(fn ($record) => '<tr><td>'.e($record['fecha']).'</td><td>'.e($record['cliente']).'</td><td>'.e($record['servicio']).'</td><td>'.e($record['estado']).'</td><td>'.e(number_format($record['valor_final'], 2)).'</td></tr>')->implode('');
        $value = number_format($data['summary']['totalRevenue'], 2);
        $period = e($data['period']['start'].' — '.$data['period']['end']);
        $html = '<!doctype html><html lang="es"><meta charset="utf-8"><title>'.$title.'</title><style>body{font:15px system-ui;margin:40px;color:#163b30}h1{font-size:28px}table{border-collapse:collapse;width:100%}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}small{color:#536b64}</style><h1>'.$title.'</h1><p>'.$period.' · '.$currency.'</p><p>Valor de servicios realizados: '.$value.' '.$currency.'</p><small>Corresponde a citas completadas; no equivale a cobros ni ganancia neta. Guarda como PDF desde Imprimir.</small><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Valor final ('.$currency.')</th></tr></thead><tbody>'.$rows.'</tbody></table></html>';
        return response($html)->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'private, no-store')
            ->header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
            ->header('Content-Disposition', 'inline; filename="reporte_ejecutivo.html"');
    }

    private function report(Request $request): array
    {
        $data = $request->validate([
            'start_date' => ['sometimes', 'date_format:Y-m-d'], 'end_date' => ['sometimes', 'date_format:Y-m-d'],
            'currency' => ['sometimes', 'regex:/^[A-Z]{3}$/'], 'business_id' => ['sometimes', 'integer', 'min:1'],
        ]);
        return $this->service->getDetailedReport($request->user(), $data['start_date'] ?? null, $data['end_date'] ?? null,
            $data['currency'] ?? null, isset($data['business_id']) ? (int) $data['business_id'] : null);
    }
}
