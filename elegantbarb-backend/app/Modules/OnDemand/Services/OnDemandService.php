<?php

namespace App\Modules\OnDemand\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Core\Enums\OnDemandStatus;
use App\Modules\OnDemand\Models\OnDemandStatusHistory;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\OnDemand\Repositories\OnDemandAssignmentRepository;
use App\Modules\OnDemand\Repositories\OnDemandRequestRepository;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Facades\DB;

class OnDemandService implements ServiceInterface
{
    public function __construct(
        private OnDemandRequestRepository $requestRepository,
        private OnDemandAssignmentRepository $assignmentRepository
    ) {}

    public function all(array $filters = []): ServiceResponse
    {
        try {
            $query = OnDemandRequest::with(['client:id,name', 'professional:id,name,photo_url,phone', 'service', 'business:id,name']);

            if (! empty($filters['client_id'])) {
                $query->where(['client_id' => $filters['client_id']]);
            }

            if (! empty($filters['professional_id'])) {
                $professionalId = $filters['professional_id'];
                $query->where(fn ($scope) => $scope->where('professional_id', $professionalId)
                    ->orWhere(fn ($offer) => $offer->where('status', 'SEARCHING')->where('search_expires_at', '>', now())
                        ->whereHas('assignments', fn ($assignment) => $assignment->where('professional_id', $professionalId)->where('status', 'PENDING'))));
            }

            if (! empty($filters['status'])) {
                $query->where(['status' => $filters['status']]);
            }

            if (! empty($filters['business_id']) && empty($filters['professional_id'])) {
                $query->where(['business_id' => $filters['business_id']]);
            }

            $requests = $query->orderBy('created_at', 'desc')->limit(100)->get();
            $requests->each(fn ($request) => app(OnDemandPresentationService::class)->present($request, auth()->user()));

            return ServiceResponse::success($requests, 'Solicitudes obtenidas');
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al obtener solicitudes', null, 500);
        }
    }

    public function find(int $id): ServiceResponse
    {
        try {
            $request = $this->requestRepository->with([
                'professional:id,name,photo_url,phone',
                'client:id,name',
                'service',
                'business',
                'statusHistory',
            ])->find($id);

            if (! $request) {
                return ServiceResponse::notFound('Solicitud on-demand');
            }

            return ServiceResponse::success(app(OnDemandPresentationService::class)->present($request, auth()->user()), 'Solicitud encontrada');
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al buscar la solicitud', null, 500);
        }
    }

    public function create(array $data): ServiceResponse
    {
        return $this->request($data);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        try {
            $request = $this->requestRepository->find($id);
            if (! $request) {
                return ServiceResponse::notFound('Solicitud on-demand');
            }

            $this->requestRepository->update($id, $data);

            return ServiceResponse::success($this->requestRepository->find($id), 'Solicitud actualizada');
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al actualizar la solicitud', null, 500);
        }
    }

    public function delete(int $id): ServiceResponse
    {
        try {
            $request = $this->requestRepository->find($id);
            if (! $request) {
                return ServiceResponse::notFound('Solicitud on-demand');
            }

            $this->requestRepository->delete($id);

            return ServiceResponse::success(null, 'Solicitud eliminada');
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al eliminar la solicitud', null, 500);
        }
    }

    public function request(array $data): ServiceResponse
    {
        if (! empty($data['business_id'])) app(\App\Modules\Business\Services\BusinessService::class)->assertBookable((int) $data['business_id']);
        try {
            return DB::transaction(function () use ($data) {
                $data['request_code'] = 'OD-' . strtoupper(\Str::random(8));
                $data['status'] = OnDemandStatus::SEARCHING->value;
                $data['search_timeout_seconds'] = $data['search_timeout_seconds'] ?? 300;
                $data['search_expires_at'] = now()->addSeconds($data['search_timeout_seconds']);

                $onDemandRequest = $this->requestRepository->create($data);

                $professionals = $this->requestRepository->getNearbyProfessionals(
                    (float) $data['client_lat'],
                    (float) $data['client_lng'],
                    $data['radius_km'] ?? 10.0,
                    $data['business_id'] ?? null
                );

                if (! empty($professionals)) {
                    foreach ($professionals as $professional) {
                        $profile = Professional::find($professional->id);
                        if (! $profile || ! app(OnDemandEligibilityService::class)->eligible($profile, $onDemandRequest, (float) $professional->distance)) continue;
                        $this->assignmentRepository->create([
                            'request_id' => $onDemandRequest->id,
                            'professional_id' => $professional->id,
                            'status' => 'PENDING',
                            'offered_at' => now(),
                            'distance_km' => $professional->distance ?? null,
                        ]);
                    }
                }

                return ServiceResponse::success($onDemandRequest, 'Solicitud creada exitosamente', 201);
            });
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al crear la solicitud', null, 500);
        }
    }

    public function accept(int $requestId, int $professionalId): ServiceResponse
    {
        try {
            return DB::transaction(function () use ($requestId, $professionalId) {
                $request = OnDemandRequest::lockForUpdate()->find($requestId);
                if (! $request) {
                    return ServiceResponse::notFound('Solicitud on-demand');
                }

                if ($request->status !== OnDemandStatus::SEARCHING->value || ! $request->search_expires_at?->isFuture()) {
                    return ServiceResponse::error('La solicitud no está en estado de búsqueda');
                }

                $assignment = $this->assignmentRepository->findByRequestAndProfessional($requestId, $professionalId);
                if (! $assignment || $assignment->status !== 'PENDING') {
                    return ServiceResponse::notFound('Asignación');
                }

                $professional = Professional::whereKey($professionalId)->lockForUpdate()->first();
                if (! $professional?->is_active || ! $professional->business_id
                    || ($request->business_id && (int) $request->business_id !== (int) $professional->business_id)) {
                    return ServiceResponse::forbidden('El profesional no está disponible para atender esta solicitud.');
                }
                if (! app(OnDemandEligibilityService::class)->eligible($professional, $request, $assignment->distance_km !== null ? (float) $assignment->distance_km : null)) {
                    return ServiceResponse::error('Tu disponibilidad cambió. Revisa tu agenda, pausa o ubicación.', null, 409);
                }

                $this->requestRepository->update($requestId, [
                    'professional_id' => $professionalId,
                    'business_id' => $request->business_id ?? $professional->business_id,
                    'status' => OnDemandStatus::ACCEPTED->value,
                    'accepted_at' => now(),
                ]);

                $this->assignmentRepository->update($assignment->id, [
                    'status' => 'ACCEPTED',
                    'responded_at' => now(),
                ]);

                $this->assignmentRepository->updatePendingByRequest($requestId, [
                    'status' => 'REJECTED',
                    'responded_at' => now(),
                ], $professionalId);

                $this->createStatusHistory(
                    $requestId,
                    $request->status,
                    OnDemandStatus::ACCEPTED->value,
                    null,
                    'Profesional aceptó la solicitud'
                );

                $oldStatus = $request->status;
                $request->refresh();
                event(new \App\Modules\OnDemand\Events\OnDemandStatusUpdated($request, $oldStatus, OnDemandStatus::ACCEPTED->value));

                return ServiceResponse::success($request, 'Solicitud aceptada exitosamente');
            });
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al aceptar la solicitud', null, 500);
        }
    }

    public function updateStatus(int $requestId, string $newStatus, ?int $userId = null, ?string $notes = null, ?float $finalPrice = null): ServiceResponse
    {
        try {
            return DB::transaction(function () use ($requestId, $newStatus, $userId, $notes, $finalPrice) {
                $request = OnDemandRequest::lockForUpdate()->find($requestId);
                if (! $request) {
                    return ServiceResponse::notFound('Solicitud on-demand');
                }

                $currentStatus = OnDemandStatus::from($request->status);
                $targetStatus = OnDemandStatus::from($newStatus);

                if (! $currentStatus->canTransitionTo($targetStatus)) {
                    return ServiceResponse::error('Transición de estado no permitida');
                }

                if ($finalPrice !== null && (! is_finite($finalPrice) || $finalPrice < 0 || $finalPrice > 9999999999.99 || $targetStatus !== OnDemandStatus::COMPLETED)) {
                    return ServiceResponse::error('El valor final solo puede registrarse al completar el servicio y debe ser válido.');
                }

                if ($targetStatus === OnDemandStatus::COMPLETED) {
                    $quote = $request->metadata['price_quote'] ?? null;
                    $agreed = $quote && ! empty($quote['accepted_at']) ? (float) $quote['amount'] : ($request->estimated_price !== null ? (float) $request->estimated_price : null);
                    if ($finalPrice !== null && ($agreed === null || round($finalPrice, 2) !== round($agreed, 2))) {
                        return ServiceResponse::error('El valor final requiere una cotización vigente aceptada por el cliente.', null, 422);
                    }
                }

                $updateData = ['status' => $newStatus];

                switch ($targetStatus) {
                    case OnDemandStatus::ACCEPTED:
                        $updateData['accepted_at'] = now();
                        break;
                    case OnDemandStatus::IN_PROGRESS:
                        $updateData['arrived_at'] = $request->arrived_at ?? now();
                        $updateData['started_at'] = now();
                        break;
                    case OnDemandStatus::COMPLETED:
                        $updateData['completed_at'] = now();
                        $updateData['metadata'] = array_merge($request->metadata ?? [], ['actual_duration_minutes' => $request->started_at ? max(0, (int) $request->started_at->diffInMinutes(now())) : null]);
                        if ($finalPrice !== null) $updateData['final_price'] = $finalPrice;
                        break;
                    case OnDemandStatus::CANCELLED:
                        $updateData['cancelled_at'] = now();
                        break;
                }

                $this->requestRepository->update($requestId, $updateData);

                $this->createStatusHistory($requestId, $request->status, $newStatus, $userId, $notes);

                $oldStatus = $request->status;
                $request->refresh();
                event(new \App\Modules\OnDemand\Events\OnDemandStatusUpdated($request, $oldStatus, $newStatus));

                return ServiceResponse::success($request, 'Estado actualizado exitosamente');
            });
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al actualizar el estado', null, 500);
        }
    }

    public function cancel(int $requestId, string $reason, int $cancelledBy): ServiceResponse
    {
        try {
            return DB::transaction(function () use ($requestId, $reason, $cancelledBy) {
                $request = OnDemandRequest::lockForUpdate()->find($requestId);
                if (! $request) {
                    return ServiceResponse::notFound('Solicitud on-demand');
                }

                $currentStatus = OnDemandStatus::from($request->status);
                if (! $currentStatus->canTransitionTo(OnDemandStatus::CANCELLED)) {
                    return ServiceResponse::error('No se puede cancelar la solicitud en su estado actual');
                }

                $this->requestRepository->update($requestId, [
                    'status' => OnDemandStatus::CANCELLED->value,
                    'cancellation_reason' => $reason,
                    'cancelled_by' => $cancelledBy,
                    'cancelled_at' => now(),
                ]);

                $this->createStatusHistory(
                    $requestId,
                    $request->status,
                    OnDemandStatus::CANCELLED->value,
                    $cancelledBy,
                    "Cancelado: {$reason}"
                );

                $this->assignmentRepository->updatePendingByRequest($requestId, [
                    'status' => 'CANCELLED',
                    'responded_at' => now(),
                ]);

                $oldStatus = $request->status;
                $request->refresh();
                event(new \App\Modules\OnDemand\Events\OnDemandStatusUpdated($request, $oldStatus, OnDemandStatus::CANCELLED->value));

                return ServiceResponse::success($request, 'Solicitud cancelada exitosamente');
            });
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al cancelar la solicitud', null, 500);
        }
    }

    public function autoAssign(int $requestId): ServiceResponse
    {
        return app(OnDemandOfferService::class)->offer($requestId);
    }

    public function getNearbyProfessionals(float $lat, float $lng, float $radiusKm, ?int $businessId = null): ServiceResponse
    {
        try {
            $professionals = $this->requestRepository->getNearbyProfessionals($lat, $lng, $radiusKm, $businessId);

            return ServiceResponse::success($professionals, 'Profesionales cercanos obtenidos');
        } catch (\Exception $e) {
            report($e);
            return ServiceResponse::error('Error al buscar profesionales cercanos', null, 500);
        }
    }

    private function createStatusHistory(int $requestId, ?string $fromStatus, string $toStatus, ?int $changedBy, ?string $notes): void
    {
        OnDemandStatusHistory::create([
            'request_id' => $requestId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by' => $changedBy,
            'notes' => $notes,
        ]);
        $event = match ($toStatus) {
            OnDemandStatus::IN_PROGRESS->value => 'service.started',
            OnDemandStatus::COMPLETED->value => 'service.completed',
            default => null,
        };
        if ($event === null) return;
        $request = OnDemandRequest::with('business')->findOrFail($requestId);
        if ($request->business_id === null) return;
        app(\App\Modules\Platform\Services\MarketplaceOutbox::class)->record(
            'on-demand:'.$requestId.':'.$toStatus, $event, $request->business_id, $request->business?->owner_user_id,
            ['on_demand_request_id' => $requestId, 'service_id' => $request->service_id,
                'professional_id' => $request->professional_id, 'status' => $toStatus]
        );
    }
}
