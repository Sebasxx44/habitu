<?php

namespace App\Interfaces\Services;

interface ReportServiceInterface
{
    public function getDetailedReport($user, $startDate, $endDate, ?string $currency = null, ?int $businessId = null);
    public function getSuperadminOverview($days);
    public function getAdminShopPerformance($user);
}
