<?php

namespace App\Http\Controllers;

use App\Interfaces\Services\BarberShopServiceInterface;
use Illuminate\Http\Request;

class BarberShopController extends Controller
{
    protected $service;

    public function __construct(BarberShopServiceInterface $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        $data = $this->service->getShopsList($request->all());
        return response()->json($data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:200',
            'address' => 'required|string|max:500',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'city_id' => 'nullable|integer',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'opening_hours' => 'nullable|string',
            'description' => 'nullable|string',
            'license' => 'nullable|array',
        ]);

        $licenseData = $request->license ?? null;
        unset($data['license']);

        $shop = $this->service->createShop($data, $licenseData);
        return response()->json($shop, 201);
    }

    public function show($id)
    {
        $shop = $this->service->getShopDetails($id);
        return response()->json($shop);
    }

    public function update(Request $request, $id)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'address' => 'sometimes|required|string|max:500',
            'phone' => 'nullable|string|max:50',
            'whatsapp' => 'nullable|string|max:50',
            'instagram' => 'nullable|string|max:100',
            'email' => 'nullable|email',
            'city_id' => 'nullable|integer',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'opening_hours' => 'nullable|string',
            'description' => 'nullable|string',
            'active' => 'boolean',
            'banner_url' => 'nullable|string',
            'photo_url' => 'nullable|string',
            'license' => 'nullable|array',
            'current_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:8|confirmed',
        ]);

        // Handle security updates for the authenticated user
        if ($request->filled('current_password')) {
            $user = auth()->user();
            
            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $user->password)) {
                return response()->json(['message' => 'La contraseña actual es incorrecta'], 422);
            }

            if ($request->filled('new_password')) {
                $user->password = \Illuminate\Support\Facades\Hash::make($request->new_password);
            }

            if ($request->filled('email')) {
                $user->email = $request->email;
            }

            $user->save();
        }

        $licenseData = $request->license ?? null;
        unset($data['license'], $data['current_password'], $data['new_password'], $data['new_password_confirmation']);

        $shop = $this->service->updateShop($id, $data, $licenseData);
        return response()->json($shop);
    }

    public function destroy($id)
    {
        $this->service->deleteShop($id);
        return response()->json(['message' => 'Barbería eliminada'], 200);
    }
}