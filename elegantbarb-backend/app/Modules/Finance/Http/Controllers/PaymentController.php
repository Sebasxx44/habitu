<?php

namespace App\Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('finance.payments')
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderBy('created_at', 'desc')
            ->paginate(50);
        return ServiceResponse::success($query, 'Pagos obtenidos')->toJsonResponse();
    }

    public function stats(Request $request)
    {
        $businessId = $request->business_id;
        $stats = DB::table('finance.payments')
            ->when($businessId, fn($q, $id) => $q->where('business_id', $id))
            ->selectRaw("status, COUNT(*) as count, SUM(amount) as total")
            ->groupBy('status')
            ->get();
        return ServiceResponse::success($stats, 'Estadísticas de pagos')->toJsonResponse();
    }
}
