<?php

namespace App\Jobs\OnDemand;

use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class NotifyNearbyProfessionals implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $requestId) {}

    public function handle(NotificationService $notifications): void
    {
        $request = OnDemandRequest::with(['business', 'service'])->find($this->requestId);
        if (! $request || $request->status !== 'SEARCHING') return;

        $professionals = $this->findNearbyProfessionals(
            $request->client_lat,
            $request->client_lng,
            10,
            $request->business_id
        );

        foreach ($professionals as $prof) {
            $userId = Professional::find($prof->id)?->user_id;
            if (! $userId) continue;

            $notifications->sendToUser(
                $userId,
                'ON_DEMAND_NEARBY',
                'Nueva solicitud cerca de ti',
                "Hay una solicitud de {$request->service?->name} a {$prof->distance}km. Precio estimado: \$" . number_format($request->estimated_price ?? 0),
                [
                    'request_id' => $request->id,
                    'request_code' => $request->request_code,
                    'distance_km' => $prof->distance,
                    'action_url' => "/professional/on-demand",
                ]
            );
        }
    }

    protected function findNearbyProfessionals(?float $lat, ?float $lng, float $radiusKm = 10, ?int $businessId = null)
    {
        $query = DB::table('people.professionals')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->select('id', 'name', 'business_id');

        if ($businessId) $query->where('business_id', $businessId);

        if ($lat && $lng) {
            $query->selectRaw("(
                6371 * acos(
                    cos(radians(?)) * cos(radians(lat)) *
                    cos(radians(lng) - radians(?)) +
                    sin(radians(?)) * sin(radians(lat))
                )
            ) AS distance", [$lat, $lng, $lat])
            ->having('distance', '<=', $radiusKm)
            ->orderBy('distance');
        }

        return $query->limit(20)->get();
    }
}
