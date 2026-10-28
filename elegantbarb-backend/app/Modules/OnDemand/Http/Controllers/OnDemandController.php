<?php

namespace App\Modules\OnDemand\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\OnDemand\Services\OnDemandService;
use App\Modules\OnDemand\Services\OnDemandAnalyticsService;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OnDemandController extends Controller
{
    public function __construct(
        private OnDemandService $service
    ) {
        $this->middleware('auth:sanctum');
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $filters = $request->only(['status', 'business_id']);

        $client = \App\Modules\People\Models\Client::where('user_id', $user->id)->first();
        $professional = \App\Modules\People\Models\Professional::where('user_id', $user->id)->first();

        if ($user->role === \App\Models\User::ROLE_CLIENT && $client) {
            $filters['client_id'] = $client->id;
        } elseif ($user->role === \App\Models\User::ROLE_PROFESSIONAL && $professional) {
            $filters['professional_id'] = $professional->id;
        } elseif (! in_array($user->role, [\App\Models\User::ROLE_ADMIN, \App\Models\User::ROLE_SUPERADMIN], true)) {
            return ServiceResponse::forbidden('No tienes un perfil operativo asignado')->toJsonResponse();
        }

        $response = $this->service->all($filters);
        return $response->toJsonResponse();
    }

    public function analytics(Request $request, OnDemandAnalyticsService $analytics): JsonResponse
    {
        $filters = $request->validate(['business_id' => 'sometimes|integer|min:1']);
        return ServiceResponse::success($analytics->overview($request->user(), AnalyticsPeriod::fromRequest($request),
            isset($filters['business_id']) ? (int) $filters['business_id'] : null))->toJsonResponse()
            ->header('Cache-Control', 'private, no-store');
    }

    public function show(int $id): JsonResponse
    {
        $response = $this->service->find($id);
        return $response->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => 'required|integer|exists:pgsql.people.clients,id',
            'business_id' => 'nullable|integer|exists:pgsql.business.businesses,id',
            'service_id' => 'nullable|integer|exists:pgsql.catalog.services,id',
            'description' => 'nullable|string|max:2000',
            'client_lat' => 'required|numeric|between:-90,90',
            'client_lng' => 'required|numeric|between:-180,180',
            'client_address' => 'required|string|max:500',
            'estimated_price' => 'nullable|numeric|min:0',
            'radius_km' => 'nullable|numeric|min:0.1|max:100',
            'search_timeout_seconds' => 'nullable|integer|min:30|max:3600',
        ]);

        if (! empty($data['service_id'])) {
            $service = \App\Modules\Catalog\Models\Service::findOrFail($data['service_id']);
            abort_unless($service->is_active, 422, 'El servicio no está disponible.');
            abort_if(! empty($data['business_id']) && (int) $service->business_id !== (int) $data['business_id'], 422, 'El servicio no pertenece al negocio.');
            $data['business_id'] = $service->business_id;
            $data['estimated_price'] = $service->price;
        } else {
            unset($data['estimated_price']);
        }
        $response = $this->service->request($data);
        return $response->toJsonResponse();
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $professional = \App\Modules\People\Models\Professional::where('user_id', Auth::id())->first();

        if (! $professional) {
            return ServiceResponse::forbidden('Solo los profesionales pueden aceptar solicitudes')->toJsonResponse();
        }

        $response = $this->service->accept($id, $professional->id);
        return $response->toJsonResponse();
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|string|in:ON_THE_WAY,IN_PROGRESS,COMPLETED',
            'notes' => 'nullable|string|max:2000',
            'final_price' => 'nullable|numeric|min:0|max:9999999999.99|prohibited_unless:status,COMPLETED',
        ]);

        $userId = Auth::id();
        $response = $this->service->updateStatus($id, $data['status'], $userId, $data['notes'] ?? null, isset($data['final_price']) ? (float) $data['final_price'] : null);
        return $response->toJsonResponse();
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $userId = Auth::id();
        $response = $this->service->cancel($id, $data['reason'], $userId);
        return $response->toJsonResponse();
    }

    public function reassign(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:10|max:1000']);
        return app(\App\Modules\OnDemand\Services\OnDemandReassignmentService::class)->reopen($id, $request->user(), $data['reason'])->toJsonResponse();
    }

    public function proposeQuote(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|numeric|min:0|max:9999999999.99', 'reason' => 'required|string|min:10|max:1000']);
        return app(\App\Modules\OnDemand\Services\OnDemandQuoteService::class)->propose($id, $request->user(), $data)->toJsonResponse();
    }

    public function acceptQuote(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['quote_id' => 'required|uuid']);
        return app(\App\Modules\OnDemand\Services\OnDemandQuoteService::class)->accept($id, $request->user(), $data['quote_id'])->toJsonResponse();
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return app(\App\Modules\OnDemand\Services\OnDemandOfferService::class)->reject($id, $request->user())->toJsonResponse();
    }

    public function presence(Request $request): JsonResponse
    {
        $data = $request->isMethod('GET') ? [] : $request->validate(['is_paused' => 'required|boolean']);
        return app(\App\Modules\OnDemand\Services\OnDemandOfferService::class)
            ->presence($request->user(), $data['is_paused'] ?? null)->toJsonResponse();
    }

    public function nearbyProfessionals(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius' => 'nullable|numeric|min:0.1|max:100',
            'business_id' => 'nullable|integer|exists:pgsql.business.businesses,id',
        ]);

        $response = $this->service->getNearbyProfessionals(
            (float) $data['lat'],
            (float) $data['lng'],
            (float) ($data['radius'] ?? 10.0),
            $data['business_id'] ?? null
        );

        return $response->toJsonResponse();
    }
}
