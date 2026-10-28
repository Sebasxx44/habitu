<?php

namespace App\Services;

use App\Interfaces\Repositories\DashboardRepositoryInterface;
use App\Interfaces\Services\DashboardServiceInterface;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\Client;

class DashboardService implements DashboardServiceInterface
{
    protected $repository;

    public function __construct(DashboardRepositoryInterface $repository)
    {
        $this->repository = $repository;
    }

    public function getSuperadminDashboard($filters)
    {
        return $this->repository->getSuperadminDashboardData($filters);
    }

    public function getAdminDashboard($user, $requestedShopId = null)
    {
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true), 403);
        $businesses = Business::query()->when($user->role !== 'SUPERADMIN', fn ($query) => $query->where('owner_user_id', $user->id));
        $shopId = $requestedShopId ? $businesses->whereKey($requestedShopId)->value('id') : $businesses->value('id');

        if (!$shopId) {
            throw new \Exception('No tienes barbería asignada', 403);
        }

        return $this->repository->getAdminDashboardData($shopId);
    }

    public function getBarberDashboard($user, $requestedBarberId = null, $startDate = null, $endDate = null, ?string $currency = null)
    {
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA', 'PROFESSIONAL'], true), 403);
        $professionals = Professional::query()
            ->when($user->role === 'ADMIN_BARBERIA', fn ($query) => $query->whereIn('business_id', Business::where('owner_user_id', $user->id)->select('id')))
            ->when($user->role === 'PROFESSIONAL', fn ($query) => $query->where('user_id', $user->id));
        $barberId = $requestedBarberId ? $professionals->whereKey($requestedBarberId)->value('id') : $professionals->value('id');

        if (!$barberId) {
            throw new \Exception('No tienes perfil de barbero asignado', 403);
        }

        $start = $startDate ?: now()->startOfMonth()->format('Y-m-d');
        $end = $endDate ?: now()->format('Y-m-d');

        return $this->repository->getBarberDashboardData($barberId, $start, $end, $currency);
    }

    public function getClientDashboard($user)
    {
        $clientId = Client::where('user_id', $user->id)->value('id');

        if (!$clientId) {
            return [
                'stats' => [
                    'totalAppointments' => 0,
                    'upcomingAppointments' => 0,
                    'completedAppointments' => 0,
                    'totalSpent' => 0,
                ],
                'client' => null,
                'appointments' => [],
                'upcoming' => [],
                'services' => [],
                'needs_onboarding' => true,
            ];
        }

        return $this->repository->getClientDashboardData($clientId);
    }

    public function getShopsMap()
    {
        return $this->repository->getShopsMap();
    }

    public function getCountries()
    {
        return $this->repository->getCountriesWithShops();
    }

    public function getCities($countryId = null)
    {
        return $this->repository->getCities($countryId);
    }

    public function getShopBasicStats($user)
    {
        $shopId = $user->barber_shop_id;
        
        if (!$shopId) {
            throw new \Exception('No shop assigned', 403);
        }

        return $this->repository->getBasicShopStats($shopId);
    }

    public function getIncomeChart($days, $shopId = null)
    {
        return $this->repository->getIncomeChartData($days, $shopId);
    }
}