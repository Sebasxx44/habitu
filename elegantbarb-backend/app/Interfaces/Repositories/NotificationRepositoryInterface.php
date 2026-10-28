<?php

namespace App\Interfaces\Repositories;

interface NotificationRepositoryInterface extends BaseRepositoryInterface
{
    public function getUserNotifications($userId, $limit = 50);
    public function getUnreadCount($userId);
    public function markAllAsRead($userId);
}
