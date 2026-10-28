<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\ServiceServiceInterface;
use App\Modules\Catalog\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    protected $service;

    public function __construct(ServiceServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        return response()->json($this->service->getAllServices());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'price' => 'required|numeric',
            'duration' => 'required|integer',
            'barber_shop_id' => 'required|integer',
            'image_url' => 'nullable|string',
            'media_gallery' => 'nullable|array',
            'category' => 'nullable|string',
        ]);

        $newService = $this->service->createService($data);
        return response()->json($newService, 201);
    }

    public function show(Service $service)
    {
        return response()->json($this->service->getService($service));
    }

    public function update(Request $request, Service $service)
    {
        $data = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
            'price' => 'sometimes|numeric',
            'duration' => 'sometimes|integer',
            'barber_shop_id' => 'sometimes|integer',
            'image_url' => 'nullable|string',
            'media_gallery' => 'nullable|array',
            'category' => 'nullable|string',
            'active' => 'sometimes|boolean',
        ]);

        $this->service->updateService($service, $data);
        return response()->json($service->fresh());
    }

    public function destroy(Service $service)
    {
        $this->service->deleteService($service);
        return response()->json(null, 204);
    }

    public function stats(Service $service)
    {
        $stats = $this->service->getServiceStats($service);
        return response()->json($stats);
    }
}