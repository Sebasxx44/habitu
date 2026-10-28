<?php

namespace App\Interfaces\Services;

interface DashboardServiceInterface
{
    public function getSuperadminDashboard($filters);
    public function getAdminDashboard($user, $requestedShopId = null);
    public function getBarberDashboard($user, $requestedBarberId = null, $startDate = null, $endDate = null, ?string $currency = null);
    public function getClientDashboard($user);
    public function getShopsMap();
    public function getCountries();
    public function getCities($countryId = null);
    public function getShopBasicStats($user);
    public function getIncomeChart($days, $shopId = null);
}
