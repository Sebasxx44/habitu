<?php

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Reports\Models\ReportExport;
use App\Modules\Reports\Services\ReportExportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class ReportExportController extends Controller
{
    public function __construct(private ReportExportService $exports) {}

    public function index(Request $request)
    {
        $this->exports->authorize($request->user());
        return response()->json(['data' => ReportExport::where('user_id', $request->user()->id)
            ->where('expires_at', '>', now())->latest()->limit(20)->get()])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request)
    {
        $this->exports->authorize($request->user());
        $filters = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'business_id' => ['sometimes', 'integer', 'min:1'],
            'currency' => ['required', 'regex:/^[A-Z]{3}$/'],
            'search' => ['sometimes', 'string', 'max:150'],
            'status' => ['sometimes', 'in:PENDING,CONFIRMED,IN_PROGRESS,COMPLETED,CANCELLED,NO_SHOW'],
            'professional' => ['sometimes', 'string', 'max:255'],
            'service' => ['sometimes', 'string', 'max:255'],
            'payment' => ['sometimes', 'string', 'max:255'],
        ]);
        abort_if(CarbonImmutable::parse($filters['start_date'])->diffInDays($filters['end_date']) > 365, 422,
            'Selecciona un período de hasta 366 días.');
        return response()->json(['data' => $this->exports->create($request->user(), $filters),
            'message' => 'Exportación solicitada. Puedes continuar trabajando.'], 202);
    }

    public function show(Request $request, string $id)
    {
        return response()->json(['data' => $this->exports->find($request->user(), $id)])
            ->header('Cache-Control', 'private, no-store');
    }

    public function download(Request $request, string $id)
    {
        $export = $this->exports->find($request->user(), $id);
        return $this->file($export);
    }

    public function downloadLink(Request $request, string $id)
    {
        $export = $this->exports->find($request->user(), $id);
        abort_unless($export->status === 'completed' && $export->expires_at->isFuture(), 409);
        return response()->json(['url' => URL::temporarySignedRoute('report-exports.file', now()->addMinutes(2), [
            'id' => $export->id, 'user_id' => $request->user()->id,
        ], false)])->header('Cache-Control', 'private, no-store');
    }

    public function signedDownload(Request $request, string $id)
    {
        $user = User::findOrFail($request->integer('user_id'));
        return $this->file($this->exports->find($user, $id));
    }

    private function file(ReportExport $export)
    {
        abort_if($export->expires_at->isPast(), 410, 'Esta exportación venció. Genera una nueva.');
        abort_unless($export->status === 'completed', 409, 'La exportación todavía no está disponible.');
        $path = config('reports.directory').'/'.$export->id.'.csv';
        abort_unless(is_file($path), 404, 'El archivo ya no está disponible. Genera una nueva exportación.');
        return response()->download($path, 'reporte-'.$export->filters['start_date'].'-'.$export->filters['end_date'].'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
