<?php

declare(strict_types=1);

namespace App\Modules\Finance\Repositories;

use App\Modules\Finance\Models\Wallet;
use App\Repositories\BaseRepository;
use Illuminate\Pagination\LengthAwarePaginator;

class WalletRepository extends BaseRepository
{
    public function __construct(Wallet $model)
    {
        parent::__construct($model);
    }

    public function findByUserId(int $userId): ?Wallet
    {
        return $this->findBy('user_id', $userId);
    }

    public function getOrCreate(int $userId): Wallet
    {
        Wallet::query()->insertOrIgnore([
            'user_id' => $userId,
            'balance' => 0,
            'hold_balance' => 0,
            'currency' => 'COP',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return Wallet::where('user_id', $userId)->firstOrFail();
    }

    public function getTransactions(int $walletId, int $limit = 50, array $filters = []): LengthAwarePaginator
    {
        $wallet = $this->find($walletId);

        if ($wallet === null) {
            return new LengthAwarePaginator([], 0, $limit);
        }

        return $wallet->transactions()->when(! empty($filters['type']), fn ($q) => $q->where('type', $filters['type']))
            ->when(! empty($filters['from']), fn ($q) => $q->where('created_at', '>=', \Carbon\CarbonImmutable::parse($filters['from'], config('booking.timezone'))->startOfDay()->utc()))
            ->when(! empty($filters['to']), fn ($q) => $q->where('created_at', '<', \Carbon\CarbonImmutable::parse($filters['to'], config('booking.timezone'))->addDay()->startOfDay()->utc()))
            ->latest()->orderByDesc('id')->paginate($limit);
    }
}
