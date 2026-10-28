<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Booking\Services\WaitlistService;
use Illuminate\Http\Request;

class WaitlistController extends Controller
{
    public function __construct(protected WaitlistService $service) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'business_id' => 'required|exists:pgsql.business.businesses,id',
            'service_id' => 'required|exists:pgsql.catalog.services,id',
            'professional_id' => 'nullable|exists:pgsql.people.professionals,id',
            'branch_id' => 'nullable|integer|min:1', 'resource_id' => 'nullable|integer|min:1',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'preferred_date' => 'nullable|date_format:Y-m-d|after_or_equal:today',
            'preferred_date_to' => 'nullable|date_format:Y-m-d|after_or_equal:preferred_date',
            'preferred_time_start' => 'nullable|date_format:H:i',
            'preferred_time_end' => 'nullable|date_format:H:i|after_or_equal:preferred_time_start',
        ]);

        $response = \Illuminate\Support\Facades\DB::transaction(function () use ($request, $data) {
            $user = \App\Models\User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $client = \App\Modules\People\Models\Client::firstOrCreate(['user_id' => $user->id, 'business_id' => $data['business_id']], ['name' => $user->name, 'email' => $user->email]);
            return $this->service->join($data, $client->id);
        });
        return $response->toJsonResponse();
    }

    public function myWaitlist(Request $request)
    {
        $clientId = \App\Modules\People\Models\Client::where('user_id', $request->user()->id)->value('id');
        if (! $clientId) {
            return ServiceResponse::success([])->toJsonResponse();
        }

        return $this->service->myWaitlist($clientId)->toJsonResponse();
    }

    public function cancel(Request $request, int $id)
    {
        $clientId = \App\Modules\People\Models\Client::where('user_id', $request->user()->id)->value('id');
        if (! $clientId) {
            return ServiceResponse::error('Cliente no encontrado', null, 403)->toJsonResponse();
        }

        return $this->service->cancel($id, $clientId)->toJsonResponse();
    }

    public function businessIndex(Request $request)
    {
        $businessId = $request->user()->business_id ?? $request->business_id;
        if (! $businessId) {
            return ServiceResponse::error('Negocio no encontrado', null, 403)->toJsonResponse();
        }

        return $this->service->businessWaitlists($businessId)->toJsonResponse();
    }
}
