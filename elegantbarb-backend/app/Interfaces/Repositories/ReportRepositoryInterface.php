<?php

namespace App\Interfaces\Repositories;

interface ReportRepositoryInterface
{
    public function getDetailedReportData($shopId, $startDate, $endDate, ?string $currency = null);
    public function getSuperadminOverviewData($days);
    public function getAdminShopPerformanceData($shopId);
}
