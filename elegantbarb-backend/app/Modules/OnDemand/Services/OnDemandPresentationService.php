<?php

namespace App\Modules\OnDemand\Services;

use App\Models\User;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;

class OnDemandPresentationService
{
    public function present(OnDemandRequest $request, ?User $user): OnDemandRequest
    {
        $request->setAttribute('location_sharing_active', in_array($request->status, ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'], true));
        if ($user?->role !== User::ROLE_PROFESSIONAL) return $request;
        $professional = Professional::where('user_id', $user->id)->first();
        if (! $professional) return $request;
        $assignment = $request->assignments()->where('professional_id', $professional->id)->first();
        $commission = (float) $professional->commission_percentage;
        $price = $request->estimated_price !== null ? (float) $request->estimated_price : null;
        $request->setAttribute('offer_details', [
            'duration_minutes' => $request->service?->duration_minutes,
            'distance_km' => $assignment?->distance_km,
            'travel_estimate_minutes' => $assignment?->distance_km !== null ? ['min' => max(5, (int) ceil((float) $assignment->distance_km * 3)), 'max' => max(15, (int) ceil((float) $assignment->distance_km * 6))] : null,
            'travel_estimate_basis' => 'DISTANCE_ESTIMATE_NOT_LIVE_ROUTING',
            'professional_percentage' => $commission,
            'professional_net_estimate' => $price !== null ? round($price * $commission / 100, 2) : null,
            'business_share_estimate' => $price !== null ? round($price * (100 - $commission) / 100, 2) : null,
            'materials' => null,
        ]);
        if ($request->status === 'SEARCHING' && ! $request->professional_id) {
            $request->client_lat = round((float) $request->client_lat, 2);
            $request->client_lng = round((float) $request->client_lng, 2);
            $request->client_address = 'Zona aproximada; la dirección se comparte al aceptar.';
            $request->description = null;
            $request->unsetRelation('client');
            $request->makeHidden(['metadata', 'client_id']);
        }
        return $request;
    }
}
