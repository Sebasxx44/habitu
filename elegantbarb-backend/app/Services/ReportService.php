<?php

namespace App\Services;

use App\Interfaces\Repositories\ReportRepositoryInterface;
use App\Interfaces\Services\ReportServiceInterface;
use App\Modules\Platform\Services\DashboardScope;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class ReportService implements ReportServiceInterface
{
    public function __construct(private ReportRepositoryInterface $repository, private DashboardScope $scope) {}

    public function getDetailedReport($user, $startDate, $endDate, ?string $currency = null, ?int $businessId = null)
    {
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true) && $user->hasEffectivePermission('reports.view'), 403);
        $businesses = $this->scope->businesses($user);
        if ($businessId !== null) {
            abort_unless((clone $businesses)->whereKey($businessId)->exists(), 403);
            $businesses->whereKey($businessId);
        }
        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : now()->startOfMonth();
        $end = $endDate ? Carbon::parse($endDate)->startOfDay() : now()->startOfDay();
        if ($end->lt($start) || $start->diffInDays($end) > 365) {
            throw ValidationException::withMessages(['end_date' => 'El período debe estar ordenado y no superar 366 días.']);
        }
        return $this->repository->getDetailedReportData($businesses->pluck('id')->all(), $start, $end, $currency);
    }

    public function getSuperadminOverview($days)
    {
        if (filter_var($days, FILTER_VALIDATE_INT) === false || $days < 1 || $days > 366) {
            throw ValidationException::withMessages(['days' => 'El período debe estar entre 1 y 366 días.']);
        }
        return $this->repository->getSuperadminOverviewData((int) $days);
    }

    public function getAdminShopPerformance($user)
    {
        return $this->getDetailedReport($user, null, null);
    }
}
