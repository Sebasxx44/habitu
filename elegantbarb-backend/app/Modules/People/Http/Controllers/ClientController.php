<?php

namespace App\Modules\People\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\People\Models\Client;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::with('user')
            ->when($request->user()->role === 'CLIENTE', fn ($query) => $query->where('user_id', $request->user()->id))
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->search, function($q, $s) {
                $q->where(function($sq) use ($s) {
                    $sq->where('name', 'ilike', "%{$s}%")
                       ->orWhere('email', 'ilike', "%{$s}%")
                       ->orWhere('phone', 'ilike', "%{$s}%");
                });
            });
        return ServiceResponse::success($query->paginate(50), 'Clientes obtenidos')->toJsonResponse();
    }

    public function show($id)
    {
        $client = Client::with('user', 'appointments')->find($id);
        if (!$client) return ServiceResponse::error('Cliente no encontrado', null, 404)->toJsonResponse();
        return ServiceResponse::success($client, 'Cliente obtenido')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:pgsql.people.clients,email',
            'phone' => 'nullable|string',
            'business_id' => 'nullable|exists:pgsql.business.businesses,id',
            'notes' => 'nullable|string',
        ]);
        $client = Client::create($data);
        return ServiceResponse::success($client, 'Cliente creado', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $client = Client::find($id);
        if (!$client) return ServiceResponse::error('Cliente no encontrado', null, 404)->toJsonResponse();
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', \Illuminate\Validation\Rule::unique(Client::class, 'email')->ignore($client->id)],
            'phone' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:2000',
        ]);
        $client->update($data);
        return ServiceResponse::success($client, 'Cliente actualizado')->toJsonResponse();
    }

    public function destroy($id)
    {
        $client = Client::find($id);
        if (!$client) return ServiceResponse::error('Cliente no encontrado', null, 404)->toJsonResponse();
        $client->delete();
        return ServiceResponse::success(null, 'Cliente eliminado')->toJsonResponse();
    }

    public function stats(Request $request)
    {
        $businessId = $request->input('business_id');
        $query = Client::query();
        if ($businessId) $query->where('business_id', $businessId);
        return ServiceResponse::success([
            'total' => $query->count(),
            'active_this_month' => $query->where('created_at', '>=', now()->startOfMonth())->count(),
        ], 'Stats obtenidos')->toJsonResponse();
    }
}
