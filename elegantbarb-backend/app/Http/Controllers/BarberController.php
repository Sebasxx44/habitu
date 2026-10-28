<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\BarberServiceInterface;
use Illuminate\Http\Request;

class BarberController extends Controller
{
    protected $service;

    public function __construct(BarberServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request) 
    { 
        $shopId = $request->query('barber_shop_id');
        $barbers = $this->service->getAllBarbers($shopId);
        return response()->json($barbers); 
    }

    public function stats(Request $request)
    {
        $shopId = $request->query('barber_shop_id');
        if (!$shopId) return response()->json(['error' => 'Shop ID required'], 400);
        return response()->json($this->service->getBarberStats($shopId));
    }

    public function store(Request $request) {
        // Validation could be moved to a Request class
        $barber = $this->service->createBarber($request->all());
        return response()->json($barber, 201);
    }

    public function show($id) { 
        return response()->json($this->service->getBarberDetails($id)); 
    }

    public function update(Request $request, $id) {
        $barber = $this->service->updateBarber($id, $request->all());
        return response()->json($barber);
    }

    public function destroy($id) {
        $this->service->deleteBarber($id);
        return response()->json(null, 204);
    }
}