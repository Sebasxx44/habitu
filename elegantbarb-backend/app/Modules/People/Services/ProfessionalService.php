<?php

namespace App\Modules\People\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\People\Models\Professional;
use App\Modules\People\Repositories\ProfessionalRepository;
use App\Modules\People\DTOs\ProfessionalProfile;
use App\Models\User;
use App\Services\BusinessAccessService;

class ProfessionalService
{
    public function __construct(
        private ProfessionalRepository $repository,
        private ProfessionalProfile $profiles,
        private BusinessAccessService $access
    ) {}

    public function all(array $filters = [], ?User $viewer = null): ServiceResponse
    {
        $query = $this->repository->with(['business', 'availability']);

        if (! empty($filters['business_id'])) {
            $query->where(['business_id' => $filters['business_id']]);
        }

        if (! empty($filters['active'])) {
            $query->addCriteria(fn ($q) => $q->where('is_active', true));
        }

        if ($viewer?->role !== User::ROLE_SUPERADMIN) {
            $businessIds = $viewer?->role === User::ROLE_ADMIN && $viewer->hasEffectivePermission('barbers.view') ? $this->access->businessIds($viewer) : [];
            $ownUserId = $viewer?->role === User::ROLE_PROFESSIONAL ? $viewer->id : null;
            $query->addCriteria(fn ($q) => $q->where(fn ($scope) => $scope->where('is_active', true)
                ->when($businessIds, fn ($owned) => $owned->orWhereIn('business_id', $businessIds))
                ->when($ownUserId, fn ($owned) => $owned->orWhere('user_id', $ownUserId))));
        }
        $professionals = $query->all()->map(fn ($professional) => $this->profiles->present($professional, $viewer));

        return ServiceResponse::success($professionals, 'Profesionales obtenidos');
    }

    public function find(int $id, ?User $viewer = null): ServiceResponse
    {
        $professional = $this->repository->with([
            'business',
            'services',
            'portfolios',
            'availability',
        ])->find($id);

        if (! $professional) {
            return ServiceResponse::notFound('Profesional');
        }

        if (! $professional->is_active && ! $this->profiles->canViewPrivate($professional, $viewer)) {
            return ServiceResponse::notFound('Profesional');
        }
        return ServiceResponse::success($this->profiles->present($professional, $viewer), 'Profesional encontrado');
    }

    public function create(array $data): ServiceResponse
    {
        $professional = $this->repository->create($data);
        return ServiceResponse::success($professional, 'Profesional creado', 201);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $professional = $this->repository->find($id);
        if (! $professional) {
            return ServiceResponse::notFound('Profesional');
        }

        $this->repository->update($id, $data);
        return ServiceResponse::success($this->repository->find($id), 'Profesional actualizado');
    }

    public function delete(int $id): ServiceResponse
    {
        $professional = $this->repository->find($id);
        if (! $professional) {
            return ServiceResponse::notFound('Profesional');
        }

        $this->repository->delete($id);
        return ServiceResponse::success(null, 'Profesional eliminado');
    }

    public function getAvailability(int $professionalId, ?string $date = null): ServiceResponse
    {
        $professional = $this->repository->find($professionalId);
        if (! $professional) {
            return ServiceResponse::notFound('Profesional');
        }

        $availability = $professional->availability;

        if ($date) {
            $dayOfWeek = \Carbon\Carbon::parse($date)->dayOfWeek;
            $availability = $availability->where('day_of_week', $dayOfWeek);
        }

        return ServiceResponse::success($availability, 'Disponibilidad obtenida');
    }

    public function getStats(?int $businessId): ServiceResponse
    {
        $query = Professional::query();
        if ($businessId) $query->where('business_id', $businessId);
        return ServiceResponse::success([
            'total' => $query->count(),
            'active' => $query->where('is_active', true)->count(),
        ], 'Stats obtenidos');
    }
}
