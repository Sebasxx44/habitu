<?php

namespace App\Modules\OnDemand\Services;

use App\Core\DTOs\ServiceResponse;
use App\Models\User;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\OnDemand\Repositories\OnDemandRequestRepository;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Facades\DB;

class OnDemandOfferService
{
    public function __construct(private OnDemandEligibilityService $eligibility, private OnDemandRequestRepository $requests) {}

    public function offer(int $id): ServiceResponse
    {
        return DB::transaction(function () use ($id) {
            $request = OnDemandRequest::lockForUpdate()->findOrFail($id);
            abort_unless($request->status === 'SEARCHING' && $request->search_expires_at?->isFuture(), 422, 'La búsqueda no está vigente.');
            $count = 0;
            foreach ($this->requests->getNearbyProfessionals((float) $request->client_lat, (float) $request->client_lng, 10, $request->business_id) as $candidate) {
                $professional = Professional::find($candidate->id);
                if (! $professional || ! $this->eligibility->eligible($professional, $request, (float) $candidate->distance)) continue;
                $offer = OnDemandAssignment::firstOrCreate(['request_id' => $id, 'professional_id' => $professional->id],
                    ['status' => 'PENDING', 'offered_at' => now(), 'distance_km' => $candidate->distance]);
                if ($offer->status === 'PENDING') $count++;
            }
            return ServiceResponse::success(['offers' => $count, 'requires_acceptance' => true], $count ? 'Ofertas disponibles para aceptación' : 'Sin profesionales elegibles. Cambia el momento o la modalidad.');
        });
    }

    public function reject(int $id, User $user): ServiceResponse
    {
        return DB::transaction(function () use ($id, $user) {
            abort_unless($user->role === User::ROLE_PROFESSIONAL, 403);
            $request = OnDemandRequest::lockForUpdate()->findOrFail($id);
            $professional = Professional::where('user_id', $user->id)->firstOrFail();
            abort_unless($request->status === 'SEARCHING' && $request->search_expires_at?->isFuture(), 422);
            $updated = OnDemandAssignment::where('request_id', $id)->where('professional_id', $professional->id)->where('status', 'PENDING')
                ->update(['status' => 'REJECTED', 'responded_at' => now(), 'updated_at' => now()]);
            abort_unless($updated, 404);
            return ServiceResponse::success(null, 'Oferta rechazada sin penalización');
        });
    }

    public function presence(User $user, ?bool $paused = null): ServiceResponse
    {
        abort_unless($user->role === User::ROLE_PROFESSIONAL, 403);
        $professional = Professional::where('user_id', $user->id)->firstOrFail();
        return DB::transaction(function () use ($professional, $paused) {
            Professional::whereKey($professional->id)->lockForUpdate()->first();
            $query = DB::table('on_demand.professional_presence')->where('professional_id', $professional->id);
            if ($paused !== null) {
                $query->updateOrInsert(['professional_id' => $professional->id], ['is_paused' => $paused, 'updated_at' => now()]);
                if ($paused) OnDemandAssignment::where('professional_id', $professional->id)->where('status', 'PENDING')->update(['status' => 'REJECTED', 'responded_at' => now()]);
            }
            return ServiceResponse::success(['is_paused' => (bool) $query->value('is_paused')], 'Disponibilidad actualizada sin penalización');
        });
    }
}
