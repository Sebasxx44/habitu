<?php

namespace App\Modules\Tracking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\People\Models\Professional;
use App\Modules\Tracking\Services\TrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    public function __construct(
        private TrackingService $service
    ) {}

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
            'heading' => 'nullable|numeric',
            'trackable_type' => 'nullable|string|max:255',
            'trackable_id' => 'nullable|integer',
        ]);

        $userId = (int) $request->user()->id;
        $professional = Professional::where('user_id', $userId)->first();
        abort_unless($professional && $professional->is_active, 403);
        $professionalId = $professional->id;
        unset($data['trackable_type'], $data['trackable_id']);

        $response = $this->service->updateLocation($userId, $professionalId, $data);
        return $response->toJsonResponse();
    }

    public function latest(Request $request, int $professionalId): JsonResponse
    {
        $user = $request->user();
        if ((int) Professional::where('user_id', $user->id)->value('id') !== $professionalId) {
            $active = \App\Modules\OnDemand\Models\OnDemandRequest::where('professional_id', $professionalId)
                ->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS']);
            if ($user->role === \App\Models\User::ROLE_CLIENT) $active->whereHas('client', fn ($q) => $q->where('user_id', $user->id));
            abort_unless($active->exists(), 403, 'La ubicación exacta solo se comparte durante un servicio activo.');
        }
        $response = $this->service->getLatestLocation($professionalId);
        return $response->toJsonResponse();
    }

    public function history(Request $request, int $professionalId): JsonResponse
    {
        $since = $request->validate([
            'since' => 'required|date',
        ])['since'];

        $response = $this->service->getLocationHistory($professionalId, $since);
        return $response->toJsonResponse();
    }
}
