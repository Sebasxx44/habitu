<?php

namespace App\Interfaces\Repositories;

interface DashboardRepositoryInterface
{
    public function getSuperadminDashboardData($filters);
    public function getAdminDashboardData($shopId);
    public function getBarberDashboardData($barberId, $startDate, $endDate, ?string $requestedCurrency = null);
    public function getClientDashboardData($clientId);
    public function getShopsMap();
    public function getCountriesWithShops();
    public function getCities($countryId = null);
    public function getBasicShopStats($shopId);
    public function getIncomeChartData($days, $shopId = null);
}
