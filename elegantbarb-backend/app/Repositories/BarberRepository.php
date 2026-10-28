<?php

namespace App\Repositories;

use App\Modules\People\Models\Professional;
use App\Modules\Booking\Models\Appointment;
use App\Interfaces\Repositories\BarberRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class BarberRepository extends BaseRepository implements BarberRepositoryInterface
{
    public function __construct(Professional $model)
    {
        parent::__construct($model);
    }

    public function getByShop($shopId)
    {
        return $this->model->where('business_id', $shopId)
            ->withCount(['appointments as total_services' => function($q) {
                $q->where('status', 'COMPLETADA');
            }])->get();
    }

    public function getStats($shopId)
    {
        $performance = Appointment::where('business_id', $shopId)
            ->where('status', 'COMPLETADA')
            ->select(DB::raw('COUNT(id) as total'), DB::raw("to_char(date, 'Dy') as name"))
            ->groupBy(DB::raw("to_char(date, 'Dy')"))
            ->get();

        return [
            'performance' => $performance,
            'total_barbers' => $this->model->where('business_id', $shopId)->count(),
            'total_services_today' => Appointment::where('business_id', $shopId)
                ->where('status', 'COMPLETADA')
                ->whereDate('date', Carbon::today())
                ->count(),
        ];
    }
}