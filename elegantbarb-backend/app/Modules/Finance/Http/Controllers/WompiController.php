<?php

declare(strict_types=1);

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Finance\Services\WompiCheckoutService;
use App\Modules\Finance\Services\WompiGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WompiController extends Controller
{
    public function __construct(private WompiCheckoutService $checkout, private WompiGateway $gateway) {}
    public function config(): JsonResponse
    {
        $mpKey = (string) config('services.mercadopago.access_token');
        return ServiceResponse::success(['enabled' => $this->gateway->enabled(), 'environment' => $this->gateway->environment(), 'min_amount' => 5000, 'max_amount' => 5000000,
            'mercadopago_enabled' => $mpKey !== '' && ! str_contains($mpKey, '...') && filled(config('services.mercadopago.public_key'))])->toJsonResponse();
    }
    public function wallet(Request $request): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|numeric|min:5000|max:5000000|decimal:0,2', 'idempotency_key' => 'required|uuid']);
        return ServiceResponse::success($this->checkout->present($this->checkout->create($request->user()->id, 'wallet', $data['idempotency_key'], (string) $data['amount'])))->toJsonResponse();
    }
    public function membership(Request $request): JsonResponse
    {
        $data = $request->validate(['plan_id' => 'required|integer|min:1', 'idempotency_key' => 'required|uuid']);
        return ServiceResponse::success($this->checkout->present($this->checkout->create($request->user()->id, 'membership', $data['idempotency_key'], null, (int) $data['plan_id'])))->toJsonResponse();
    }
    public function show(Request $request, string $id): JsonResponse
    {
        return ServiceResponse::success($this->checkout->present(CheckoutOrder::where('user_id', $request->user()->id)->findOrFail($id)))->toJsonResponse();
    }
    public function history(Request $request): JsonResponse
    {
        return ServiceResponse::success(CheckoutOrder::where('user_id', $request->user()->id)->where('purpose', 'wallet')->latest()->limit(10)->get()->map(fn ($order) => $this->checkout->present($order)))->toJsonResponse();
    }
    public function reconcile(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['transaction_id' => ['required', 'string', 'regex:/^[a-zA-Z0-9-]{1,100}$/']]);
        return ServiceResponse::success($this->checkout->present($this->checkout->reconcile($request->user()->id, $id, $data['transaction_id'])))->toJsonResponse();
    }
    public function webhook(Request $request): JsonResponse
    {
        $this->checkout->webhook($request->json()->all());
        return response()->json(['received' => true]);
    }
}
