<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Finance\Repositories\WalletRepository;
use Illuminate\Support\Facades\DB;
use Throwable;

class WalletService
{
    public function __construct(
        private WalletRepository $repository
    ) {}

    public function getWallet(int $userId): ServiceResponse
    {
        $wallet = $this->repository->getOrCreate($userId);
        $wallet->load(['transactions' => fn ($q) => $q->latest()->limit(5)]);

        return ServiceResponse::success($wallet, 'Wallet retrieved');
    }

    public function topUp(int $userId, float|int|string $amount, array $meta = []): ServiceResponse
    {
        if ($amount <= 0) {
            return ServiceResponse::error('Amount must be greater than zero', 'Invalid amount', 422);
        }

        try {
            $wallet = DB::transaction(function () use ($userId, $amount, $meta) {
                $wallet = $this->repository->getOrCreate($userId);
                $wallet->credit($amount, $meta);

                return $wallet->fresh(['transactions' => fn ($q) => $q->latest()->limit(1)]);
            });

            return ServiceResponse::success($wallet, 'Wallet topped up successfully');
        } catch (\InvalidArgumentException $e) {
            return ServiceResponse::error($e->getMessage(), 'Operación rechazada', 422);
        } catch (Throwable $e) {
            return ServiceResponse::error('No se pudo procesar la recarga.', 'Top up failed', 500);
        }
    }

    public function pay(int $userId, float|int|string $amount, array $meta = []): ServiceResponse
    {
        if ($amount <= 0) {
            return ServiceResponse::error('Amount must be greater than zero', 'Invalid amount', 422);
        }

        $wallet = $this->repository->findByUserId($userId);

        if ($wallet === null) {
            return ServiceResponse::notFound('Wallet');
        }

        try {
            $transaction = DB::transaction(function () use ($wallet, $amount, $meta) {
                return $wallet->debit($amount, $meta);
            });

            return ServiceResponse::success($transaction, 'Payment successful');
        } catch (\InvalidArgumentException $e) {
            return ServiceResponse::error($e->getMessage(), 'Operación rechazada', 422);
        } catch (Throwable $e) {
            return ServiceResponse::error('No se pudo procesar el pago.', 'Payment failed', 500);
        }
    }

    public function getTransactions(int $userId, int $limit = 50, array $filters = []): ServiceResponse
    {
        $wallet = $this->repository->findByUserId($userId);

        if ($wallet === null) {
            return ServiceResponse::notFound('Wallet');
        }

        $transactions = $this->repository->getTransactions($wallet->id, $limit, $filters);

        return ServiceResponse::success($transactions, 'Transactions retrieved');
    }

    public function getBalance(int $userId): ServiceResponse
    {
        $wallet = $this->repository->findByUserId($userId);

        if ($wallet === null) {
            return ServiceResponse::notFound('Wallet');
        }

        return ServiceResponse::success([
            'balance' => $wallet->balance,
            'hold_balance' => $wallet->hold_balance,
            'currency' => $wallet->currency,
        ], 'Balance retrieved');
    }

    public function refund(int $userId, float|int|string $amount, array $meta = []): ServiceResponse
    {
        if ($amount <= 0) {
            return ServiceResponse::error('Amount must be greater than zero', 'Invalid amount', 422);
        }

        try {
            $transaction = DB::transaction(function () use ($userId, $amount, $meta) {
                $wallet = $this->repository->getOrCreate($userId);

                return $wallet->refund($amount, $meta);
            });

            return ServiceResponse::success($transaction, 'Refund processed successfully');
        } catch (\InvalidArgumentException $e) {
            return ServiceResponse::error($e->getMessage(), 'Operación rechazada', 422);
        } catch (Throwable $e) {
            return ServiceResponse::error('No se pudo procesar el reembolso.', 'Refund failed', 500);
        }
    }

    public function cashback(int $userId, float|int|string $amount, array $meta = []): ServiceResponse
    {
        if ($amount <= 0) {
            return ServiceResponse::error('Amount must be greater than zero', 'Invalid amount', 422);
        }

        try {
            $transaction = DB::transaction(function () use ($userId, $amount, $meta) {
                $wallet = $this->repository->getOrCreate($userId);

                return $wallet->cashback($amount, $meta);
            });

            return ServiceResponse::success($transaction, 'Cashback processed successfully');
        } catch (\InvalidArgumentException $e) {
            return ServiceResponse::error($e->getMessage(), 'Operación rechazada', 422);
        } catch (Throwable $e) {
            return ServiceResponse::error('No se pudo procesar la devolución.', 'Cashback failed', 500);
        }
    }
}
