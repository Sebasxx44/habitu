<?php

declare(strict_types=1);

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Finance\Services\PayoutSandboxService;
use App\Modules\Finance\Services\WompiPayoutSandboxGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class PayoutSandboxController extends Controller
{
    public function index(Request $request, PayoutSandboxService $service, WompiPayoutSandboxGateway $gateway)
    {
        $this->authorizeActor($request);
        return ServiceResponse::success(['sandbox_enabled' => $gateway->enabled(), 'commercial_enabled' => false,
            'withdrawals' => DB::table('finance.withdrawals')->orderByDesc('id')->limit(100)->get(['id', 'user_id', 'amount', 'status', 'created_at']),
            'attempts' => DB::table('finance.payout_sandbox_attempts')->orderByDesc('created_at')->limit(100)->get()->map(fn ($row) => $service->present($row))])->toJsonResponse();
    }
    public function prepare(Request $request, int $id, PayoutSandboxService $service)
    {
        $this->authorizeActor($request);
        $request->validate(['sandbox_acknowledged' => 'required|accepted', 'status' => 'prohibited']);
        return ServiceResponse::success($service->present($service->prepare($id, $request->user()->id)), 'Ensayo preparado con destinatario sintético.')->toJsonResponse();
    }
    public function submit(Request $request, string $id, PayoutSandboxService $service)
    {
        $this->authorizeActor($request);
        $request->validate(['sandbox_acknowledged' => 'required|accepted', 'status' => 'prohibited']);
        return ServiceResponse::success($service->present($service->submit($id, $request->user()->id)), 'Estado del ensayo sandbox; no confirma un retiro real.')->toJsonResponse();
    }
    public function reconcile(Request $request, string $id, PayoutSandboxService $service)
    {
        $this->authorizeActor($request);
        $request->validate(['status' => 'prohibited']);
        return ServiceResponse::success($service->present($service->reconcile($id, $request->user()->id)['attempt']))->toJsonResponse();
    }
    private function authorizeActor(Request $request): void
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
    }
}
