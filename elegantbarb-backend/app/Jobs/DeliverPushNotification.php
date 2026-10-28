<?php

namespace App\Jobs;

use App\Modules\Platform\Models\Notification;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeliverPushNotification implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $uniqueFor = 3600;
    public array $backoff = [30, 120, 300];

    public function __construct(public int $notificationId) {}

    public function uniqueId(): string { return (string) $this->notificationId; }

    public function handle(PushNotificationService $sender): void
    {
        $notification = Notification::find($this->notificationId);
        if (! $notification || ! $sender->configured()) return;
        $type = strtoupper($notification->type);
        $promotional = ! str_starts_with($type, 'APPOINTMENT_') && ! str_starts_with($type, 'ON_DEMAND_')
            && ! in_array($type, ['PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'PAYOUT_UPDATED', 'SECURITY_ALERT'], true);
        $results = $sender->sendToUser($notification->user_id, 'habitu', 'Tienes una novedad en tu cuenta.',
            ['event_id' => 'notification-'.$notification->id], $promotional);
        if (in_array(false, $results, true)) throw new \RuntimeException('Push provider did not acknowledge acceptance.');
    }
}
