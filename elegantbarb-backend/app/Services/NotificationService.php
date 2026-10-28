<?php

namespace App\Services;

use App\Interfaces\Services\NotificationServiceInterface;
use App\Models\Notification as LegacyNotification;
use App\Models\User;
use App\Modules\Platform\Models\Notification;

class NotificationService implements NotificationServiceInterface
{
    /**
     * Send a notification to a user (new modular model)
     */
    public function sendToUser(int $userId, string $type, string $title, string $message, array $data = []): void
    {
        Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'read' => false,
        ]);
    }

    /**
     * Send to multiple users (new modular model)
     */
    public function sendToUsers(array $userIds, string $type, string $title, string $message, array $data = []): void
    {
        $records = array_map(fn ($id) => [
            'user_id' => $id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => json_encode($data),
            'read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ], $userIds);

        Notification::insert($records);
    }

    // ─── Interface methods (legacy notifications table) ───────────────────────

    public function getInbox($userId)
    {
        $legacy = LegacyNotification::where('user_id', $userId)->latest()->limit(50)->get()
            ->map(fn (LegacyNotification $notification) => $notification->only(['id', 'title', 'message', 'type', 'read', 'created_at']));
        $current = Notification::where('user_id', $userId)->latest()->limit(50)->get()
            ->map(fn (Notification $notification) => array_merge(
                $notification->only(['title', 'message', 'type', 'read', 'created_at', 'data']),
                ['id' => 'platform-' . $notification->id]
            ));

        return [
            'notifications' => $legacy->concat($current)->sortByDesc('created_at')->take(50)->values(),
            'unread' => LegacyNotification::where('user_id', $userId)->where('read', false)->count()
                + Notification::where('user_id', $userId)->where('read', false)->count(),
        ];
    }

    public function markAsRead($notification, $userId)
    {
        $identifier = (string) $notification;
        if (preg_match('/^platform-([1-9][0-9]*)$/', $identifier, $matches)) {
            $record = Notification::where('user_id', $userId)->findOrFail((int) $matches[1]);
            $record->markAsRead();
            return;
        }
        abort_unless(ctype_digit($identifier), 404);
        LegacyNotification::where('user_id', $userId)->findOrFail((int) $identifier)->update(['read' => true]);
    }

    public function markAllRead($userId)
    {
        \Illuminate\Support\Facades\DB::transaction(fn () => [
            LegacyNotification::where('user_id', $userId)->where('read', false)->update(['read' => true]),
            Notification::where('user_id', $userId)->where('read', false)->update(['read' => true, 'read_at' => now()]),
        ]);
    }

    public function sendNotification(array $data)
    {
        return LegacyNotification::create([
            'user_id' => $data['user_id'],
            'title' => $data['title'],
            'message' => $data['message'],
            'type' => $data['type'],
            'read' => false,
        ]);
    }

    public function broadcastToRole(array $data)
    {
        $users = User::where('role', $data['role'])->get();
        foreach ($users as $user) {
            LegacyNotification::create([
                'user_id' => $user->id,
                'title' => $data['title'],
                'message' => $data['message'],
                'type' => $data['type'],
                'read' => false,
            ]);
        }
        return $users->count();
    }

    // ─── Event helpers (new modular model) ────────────────────────────────────

    public function onDemandRequestCreated(int $clientId, string $requestCode): void
    {
        $this->sendToUser($clientId, 'ON_DEMAND_CREATED', 'Solicitud enviada', "Tu solicitud {$requestCode} está siendo procesada. Buscando profesionales cercanos...", ['request_code' => $requestCode]);
    }

    public function onDemandAssigned(int $clientId, string $professionalName, string $requestCode): void
    {
        $this->sendToUser($clientId, 'ON_DEMAND_ASSIGNED', 'Profesional asignado', "{$professionalName} aceptó tu solicitud {$requestCode} y está en camino.", ['professional_name' => $professionalName, 'request_code' => $requestCode]);
    }

    public function onDemandStatusUpdated(int $userId, string $status, string $requestCode): void
    {
        $messages = [
            'ON_THE_WAY' => 'Tu profesional está en camino',
            'IN_PROGRESS' => 'El servicio ha comenzado',
            'COMPLETED' => 'Servicio completado',
        ];
        $this->sendToUser($userId, 'ON_DEMAND_STATUS', $messages[$status] ?? 'Actualización de solicitud', "Tu solicitud {$requestCode} cambió a: {$status}", ['status' => $status, 'request_code' => $requestCode]);
    }

    public function walletTransaction(int $userId, string $type, float $amount, float $balance): void
    {
        $titles = [
            'CREDIT' => 'Recarga exitosa',
            'DEBIT' => 'Pago realizado',
            'CASHBACK' => 'Cashback recibido',
            'REFUND' => 'Reembolso procesado',
        ];
        $this->sendToUser($userId, 'WALLET_TRANSACTION', $titles[$type] ?? 'Transacción de wallet', "Monto: \$" . number_format($amount, 0) . " COP. Saldo actual: \$" . number_format($balance, 0) . " COP", ['type' => $type, 'amount' => $amount, 'balance' => $balance]);
    }

    public function subscriptionRenewed(int $userId, string $planName, int $credits): void
    {
        $this->sendToUser($userId, 'SUBSCRIPTION_RENEWED', 'Suscripción renovada', "Tu plan {$planName} fue renovado exitosamente. Créditos disponibles: {$credits}", ['plan_name' => $planName, 'credits' => $credits]);
    }

    public function subscriptionExpiring(int $userId, string $planName, int $daysLeft): void
    {
        $this->sendToUser($userId, 'SUBSCRIPTION_EXPIRING', 'Tu suscripción vence pronto', "Tu plan {$planName} vence en {$daysLeft} días. Renueva para no perder tus beneficios.", ['plan_name' => $planName, 'days_left' => $daysLeft]);
    }

    public function newMessage(int $userId, string $senderName): void
    {
        $this->sendToUser($userId, 'CHAT_MESSAGE', 'Nuevo mensaje', "Tienes un nuevo mensaje de {$senderName}", ['sender_name' => $senderName]);
    }

    public function appointmentReminder(int $userId, string $serviceName, string $date, string $time): void
    {
        $this->sendToUser($userId, 'APPOINTMENT_REMINDER', 'Recordatorio de cita', "Tu cita de {$serviceName} es mañana a las {$time}", ['service_name' => $serviceName, 'date' => $date, 'time' => $time]);
    }

    public function promotionUsed(int $userId, string $code, float $discount): void
    {
        $this->sendToUser($userId, 'PROMOTION_USED', 'Descuento aplicado', "Se aplicó el código {$code} con un descuento de \$" . number_format($discount, 0) . " COP", ['code' => $code, 'discount' => $discount]);
    }
}
