<?php

namespace App\Repositories;

use App\Models\Notification;
use App\Interfaces\Repositories\NotificationRepositoryInterface;

class NotificationRepository extends BaseRepository implements NotificationRepositoryInterface
{
    public function __construct(Notification $model)
    {
        parent::__construct($model);
    }

    public function getUserNotifications($userId, $limit = 50)
    {
        return $this->model->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    public function getUnreadCount($userId)
    {
        return $this->model->where('user_id', $userId)->where('read', false)->count();
    }

    public function markAllAsRead($userId)
    {
        return $this->model->where('user_id', $userId)->where('read', false)->update(['read' => true]);
    }
}
