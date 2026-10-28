<?php

namespace App\Repositories;

use App\Modules\People\Models\Client;
use App\Modules\Booking\Models\Appointment;
use App\Interfaces\Repositories\ClientRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ClientRepository extends BaseRepository implements ClientRepositoryInterface
{
    public function __construct(Client $model)
    {
        parent::__construct($model);
    }

    public function getByShop($shopId)
    {
        return $this->model->where('business_id', $shopId)
            ->withCount(['appointments as total_visits' => function($query) {
                $query->where('status', 'COMPLETADA');
            }])
            ->with(['appointments' => function($query) {
                $query->where('status', 'COMPLETADA')->latest('date')->limit(1);
            }])
            ->get();
    }

    public function getStats($shopId)
    {
        $growth = $this->model->where('business_id', $shopId)
            ->select(
                DB::raw('COUNT(id) as clients'), 
                DB::raw("to_char(created_at, 'Mon') as name")
            )
            ->where('created_at', '>=', Carbon::now()->subMonths(6))
            ->groupBy(DB::raw("to_char(created_at, 'Mon')"), DB::raw("to_char(created_at, 'MM')"))
            ->orderBy(DB::raw("to_char(created_at, 'MM')"))
            ->get();

        $revenue = Appointment::where('business_id', $shopId)
            ->where('status', 'COMPLETADA')
            ->select(DB::raw('SUM(price) as value'), DB::raw("to_char(date, 'Dy') as name"))
            ->groupBy('name')
            ->get();

        $clients = $this->model->where('business_id', $shopId)
            ->withCount(['appointments as visits' => function($q) { $q->where('status', 'COMPLETADA'); }])
            ->get();

        $loyalty = [
            ['name' => 'Bronce', 'value' => $clients->where('visits', '<', 3)->count(), 'color' => '#94A3B8'],
            ['name' => 'Plata', 'value' => $clients->whereBetween('visits', [3, 6])->count(), 'color' => '#CBD5E1'],
            ['name' => 'Oro', 'value' => $clients->whereBetween('visits', [7, 10])->count(), 'color' => '#F59E0B'],
            ['name' => 'Diamante', 'value' => $clients->where('visits', '>', 10)->count(), 'color' => '#10B981'],
        ];

        return [
            'growth' => $growth,
            'revenue' => $revenue,
            'loyalty' => $loyalty,
            'total_clients' => $clients->count(),
            'top_client' => $clients->sortByDesc('visits')->first()
        ];
    }
}