<?php

namespace App\Console\Commands\Platform;

use App\Core\Enums\OnDemandStatus;
use App\Modules\Platform\Models\Notification;
use App\Modules\Booking\Services\AppointmentNotificationService;
use App\Modules\OnDemand\Models\OnDemandRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendScheduledNotifications extends Command
{
    protected $signature = 'platform:send-notifications';

    protected $description = 'Envía notificaciones programadas: recordatorios de citas y llegada de profesionales on-demand';

    public function handle(): int
    {
        try {
            $appointments = app(AppointmentNotificationService::class);
            $appointmentCount = $appointments->sendDueReminders();
            $appointments->dispatchPendingEmails();
            $arrivalCount = $this->sendOnDemandArrivalNotifications();

            $this->info("Notificaciones enviadas: {$appointmentCount} recordatorios de cita, {$arrivalCount} llegadas on-demand.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('No fue posible procesar las notificaciones. Revisa el estado del worker y la base de datos.');
            return self::FAILURE;
        }
    }

    private function sendOnDemandArrivalNotifications(): int
    {
        $requests = OnDemandRequest::with('client.user')
            ->where('status', OnDemandStatus::ON_THE_WAY->value)
            ->whereNotNull('client_lat')
            ->whereNotNull('client_lng')
            ->whereNotNull('professional_lat')
            ->whereNotNull('professional_lng')
            ->get();

        $count = 0;

        DB::transaction(function () use ($requests, &$count) {
            foreach ($requests as $request) {
                $request = OnDemandRequest::with('client')->lockForUpdate()->find($request->id);
                if (! $request || $request->getRawOriginal('status') !== OnDemandStatus::ON_THE_WAY->value) continue;
                $distanceKm = $this->haversineDistance(
                    (float) $request->client_lat,
                    (float) $request->client_lng,
                    (float) $request->professional_lat,
                    (float) $request->professional_lng
                );

                if ($distanceKm > 1.0) {
                    continue;
                }

                $userId = $request->client?->user_id;

                if (! $userId) {
                    continue;
                }

                $alreadySent = Notification::where('user_id', $userId)
                    ->where('type', 'ON_DEMAND_ARRIVAL')
                    ->where('data->request_id', $request->id)
                    ->exists();

                if ($alreadySent) {
                    continue;
                }

                Notification::create([
                    'user_id' => $userId,
                    'title' => 'Tu profesional está cerca',
                    'message' => 'El profesional asignado está a menos de 1 km de tu ubicación.',
                    'type' => 'ON_DEMAND_ARRIVAL',
                    'data' => ['request_id' => $request->id],
                ]);

                $count++;
            }
        });

        return $count;
    }

    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
