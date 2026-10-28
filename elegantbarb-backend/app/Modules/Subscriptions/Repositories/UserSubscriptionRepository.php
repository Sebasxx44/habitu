<?php

namespace App\Modules\Subscriptions\Repositories;

use App\Modules\Subscriptions\Models\UserSubscription;
use App\Repositories\BaseRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class UserSubscriptionRepository extends BaseRepository
{
    public function __construct(UserSubscription $model)
    {
        parent::__construct($model);
    }

    public function getActiveByUser(int $userId): ?UserSubscription
    {
        return $this->model
            ->where('user_id', $userId)
            ->where('status', 'ACTIVE')
            ->where('ends_at', '>', now())
            ->with('plan')
            ->first();
    }

    public function getByUser(int $userId, int $limit = 10): LengthAwarePaginator
    {
        return $this->model
            ->where('user_id', $userId)
            ->with('plan')
            ->orderBy('created_at', 'desc')
            ->paginate($limit);
    }
}
