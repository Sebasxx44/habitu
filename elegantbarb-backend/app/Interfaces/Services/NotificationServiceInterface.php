<?php

namespace App\Interfaces\Services;

interface NotificationServiceInterface
{
    public function getInbox($userId);
    public function markAsRead($notification, $userId);
    public function markAllRead($userId);
    public function sendNotification(array $data);
    public function broadcastToRole(array $data);
}
