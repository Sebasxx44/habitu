<?php

namespace App\Modules\Loyalty\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyProgram;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function index(Request $request)
    {
        $query = LoyaltyProgram::query()
            ->when($request->barber_shop_id, fn($q, $id) => $q->where('barber_shop_id', $id))
            ->where('active', true);
        return ServiceResponse::success($query->paginate(50), 'Programas obtenidos')->toJsonResponse();
    }

    public function show($id)
    {
        $prog = LoyaltyProgram::find($id);
        if (!$prog) return ServiceResponse::error('Programa no encontrado', null, 404)->toJsonResponse();
        return ServiceResponse::success($prog, 'Programa obtenido')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'barber_shop_id' => 'required|integer',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'stamps_required' => 'required|integer|min:1',
            'reward_description' => 'required|string',
            'valid_until' => 'nullable|date',
        ]);
        $data['active'] = true;
        $prog = LoyaltyProgram::create($data);
        return ServiceResponse::success($prog, 'Programa creado', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $prog = LoyaltyProgram::find($id);
        if (!$prog) return ServiceResponse::error('Programa no encontrado', null, 404)->toJsonResponse();
        $prog->update($request->only(['name', 'description', 'stamps_required', 'reward_description', 'active', 'valid_until']));
        return ServiceResponse::success($prog, 'Programa actualizado')->toJsonResponse();
    }

    public function destroy($id)
    {
        $prog = LoyaltyProgram::find($id);
        if (!$prog) return ServiceResponse::error('Programa no encontrado', null, 404)->toJsonResponse();
        $prog->delete();
        return ServiceResponse::success(null, 'Programa eliminado')->toJsonResponse();
    }
}
