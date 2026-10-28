<?php

declare(strict_types=1);

namespace App\Modules\Finance\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Finance\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $walletResponse = $this->walletService->getWallet($userId);

        if (! $walletResponse->success) {
            return $walletResponse->toJsonResponse();
        }

        $transactionsResponse = $this->walletService->getTransactions($userId, 10);

        return ServiceResponse::success([
            'wallet' => $walletResponse->data,
            'recent_transactions' => $transactionsResponse->success ? $transactionsResponse->data : [],
        ], 'Wallet retrieved')->toJsonResponse();
    }

    public function topUp(Request $request): JsonResponse
    {
        return ServiceResponse::forbidden('Las recargas se acreditan únicamente al confirmar el pago con la pasarela.')->toJsonResponse();
    }

    public function pay(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'description' => ['nullable', 'string', 'max:255'],
            'source_type' => ['nullable', 'string', 'max:100'],
            'source_id' => ['nullable', 'integer'],
        ]);

        $meta = [
            'description' => $validated['description'] ?? 'Wallet payment',
            'source_type' => $validated['source_type'] ?? null,
            'source_id' => $validated['source_id'] ?? null,
        ];

        return $this->walletService->pay(
            (int) $request->user()->id,
            (string) $validated['amount'],
            $meta
        )->toJsonResponse();
    }

    public function transactions(Request $request): JsonResponse
    {
        $filters = $request->validate(['type' => 'nullable|in:CREDIT,DEBIT,CASHBACK,REFUND,PAYOUT,TOPUP', 'from' => 'nullable|date_format:Y-m-d',
            'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])]]);
        $limit = min(100, max(1, (int) $request->input('per_page', 50)));


        return $this->walletService->getTransactions(
            (int) $request->user()->id,
            $limit,
            $filters
        )->toJsonResponse();
    }
}
