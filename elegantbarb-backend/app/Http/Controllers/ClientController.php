<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\ClientServiceInterface;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    protected $service;

    public function __construct(ClientServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request) 
    { 
        $shopId = $request->query('barber_shop_id');
        $clients = $this->service->getAllClients($shopId);
        return ClientResource::collection($clients);
    }

    public function stats(Request $request)
    {
        $shopId = $request->query('barber_shop_id');
        if (!$shopId) return response()->json(['error' => 'Shop ID required'], 400);
        return response()->json($this->service->getClientStats($shopId));
    }

    public function store(StoreClientRequest $request) {
        $client = $this->service->createClient($request->validated());
        return new ClientResource($client);
    }

    public function show($id) { 
        return new ClientResource($this->service->getClientDetails($id)); 
    }

    public function update(UpdateClientRequest $request, $id) {
        $client = $this->service->updateClient($id, $request->validated());
        return new ClientResource($client);
    }

    public function destroy($id) {
        $this->service->deleteClient($id);
        return response()->json(null, 204);
    }
}