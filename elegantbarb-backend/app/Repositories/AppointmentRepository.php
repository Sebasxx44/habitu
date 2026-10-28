<?php

namespace App\Repositories;

use App\Interfaces\Repositories\AppointmentRepositoryInterface;
use App\Modules\Booking\Models\Appointment;
use Carbon\Carbon;

class AppointmentRepository extends BaseRepository implements AppointmentRepositoryInterface
{
    public function __construct(Appointment $model)
    {
        parent::__construct($model);
    }

    public function getAppointmentsWithRelations($shopId = null)
    {
        $query = $this->model->with(['client', 'professional', 'service']);
        
        if ($shopId) {
            $query->where('business_id', $shopId);
        }
        
        return $query->orderBy('date', 'asc')->orderBy('start_time', 'asc')->get();
    }

    public function getAppointmentStats($shopId)
    {
        $today = Carbon::today();
        
        $baseQuery = $this->model->where('business_id', $shopId);
        
        $totalToday = (clone $baseQuery)->whereDate('date', $today)->count();
        $totalRevenueToday = (clone $baseQuery)->whereDate('date', $today)->where('status', 'completed')->sum('price');
        $completionRate = 0;
        
        $totalHistoric = (clone $baseQuery)->count();
        if ($totalHistoric > 0) {
            $completed = (clone $baseQuery)->where('status', 'completed')->count();
            $completionRate = round(($completed / $totalHistoric) * 100);
        }
        
        $statusDistribution = (clone $baseQuery)->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->get();
            
        $weeklyTrend = (clone $baseQuery)->where('date', '>=', Carbon::now()->subDays(7))
            ->selectRaw('date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return [
            'total_today' => $totalToday,
            'revenue_today' => $totalRevenueToday,
            'completion_rate' => $completionRate,
            'status_distribution' => $statusDistribution,
            'weekly_trend' => $weeklyTrend
        ];
    }
}