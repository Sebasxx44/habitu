<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Booking\Models\Resource;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class ResourceController extends Controller
{
    public function index(Request $request)
    {
        $query = Resource::with('business', 'branch')
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->branch_id, fn($q, $id) => $q->where('branch_id', $id));
        return ServiceResponse::success($query->paginate(50), 'Recursos obtenidos')->toJsonResponse();
    }

    public function show($id)
    {
        $res = Resource::with('business', 'branch')->find($id);
        if (!$res) return ServiceResponse::error('Recurso no encontrado', null, 404)->toJsonResponse();
        return ServiceResponse::success($res, 'Recurso obtenido')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'business_id' => 'required|exists:pgsql.business.businesses,id',
            'branch_id' => 'required|exists:pgsql.business.business_branches,id',
            'name' => 'required|string|max:255',
            'type' => 'nullable|in:FIELD,ROOM,CHAIR,CABIN,MACHINE,SPACE,COURT,STATION,TABLE,EQUIPMENT,OTHER',
            'attributes' => 'nullable|array:sport_type,surface,covered', 'attributes.sport_type' => 'nullable|string|max:80',
            'attributes.surface' => 'nullable|string|max:80', 'attributes.covered' => 'nullable|boolean',
            'description' => 'nullable|string',
            'capacity' => 'integer|min:1',
            'is_active' => 'boolean',
        ]);
        abort_unless(\App\Modules\Business\Models\BusinessBranch::whereKey($data['branch_id'])->where('business_id', $data['business_id'])->exists(), 422, 'La sede debe pertenecer al negocio.');
        $res = Resource::create($data);
        return ServiceResponse::success($res, 'Recurso creado', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $res = Resource::find($id);
        if (!$res) return ServiceResponse::error('Recurso no encontrado', null, 404)->toJsonResponse();
        if (($request->has('is_active') && ! $request->boolean('is_active')) || ($request->has('capacity') && (int) $request->input('capacity') < $res->capacity)) {
            abort_if($res->appointments()->whereDate('date', '>=', today())->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->exists(), 409, 'Revisa las reservas futuras antes de reducir la capacidad o desactivar el recurso.');
        }
        $res->update($request->validate([
            'name' => 'sometimes|required|string|max:255', 'type' => 'sometimes|in:FIELD,ROOM,CHAIR,CABIN,MACHINE,SPACE,COURT,STATION,TABLE,EQUIPMENT,OTHER',
            'description' => 'nullable|string|max:5000', 'capacity' => 'sometimes|integer|min:1|max:10000', 'is_active' => 'sometimes|boolean',
            'attributes' => 'nullable|array:sport_type,surface,covered', 'attributes.sport_type' => 'nullable|string|max:80',
            'attributes.surface' => 'nullable|string|max:80', 'attributes.covered' => 'nullable|boolean',
        ]));
        return ServiceResponse::success($res, 'Recurso actualizado')->toJsonResponse();
    }

    public function destroy($id)
    {
        $res = Resource::find($id);
        if (!$res) return ServiceResponse::error('Recurso no encontrado', null, 404)->toJsonResponse();
        abort_if($res->appointments()->whereDate('date', '>=', today())->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->exists(), 409, 'Revisa las reservas futuras antes de eliminar el recurso.');
        $res->delete();
        return ServiceResponse::success(null, 'Recurso eliminado')->toJsonResponse();
    }

    public function services(Request $request, int $id)
    {
        $resource = Resource::findOrFail($id);
        app(\App\Modules\People\Services\OperationsAccess::class)->business($request->user(), $resource->business_id, true);
        abort_if($request->user()->role === \App\Models\User::ROLE_PROFESSIONAL, 403);
        $data = $request->validate(['service_ids' => 'present|array|max:100', 'service_ids.*' => 'integer|distinct']);
        $serviceIds = \App\Modules\Catalog\Models\Service::where('business_id', $resource->business_id)->where('is_active', true)->pluck('id');
        abort_unless(collect($data['service_ids'])->diff($serviceIds)->isEmpty(), 422, 'Selecciona servicios de este negocio.');
        \Illuminate\Support\Facades\DB::transaction(function () use ($resource, $data, $serviceIds) {
            \App\Modules\Business\Models\BusinessBranch::whereKey($resource->branch_id)->lockForUpdate()->firstOrFail();
            Resource::whereKey($resource->id)->lockForUpdate()->firstOrFail();
            abort_if($resource->appointments()->whereDate('date', '>=', today())->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])
                ->whereNotIn('service_id', $data['service_ids'])->exists(), 409, 'Hay reservas futuras para los servicios que quieres retirar.');
            foreach ($serviceIds as $serviceId) \Illuminate\Support\Facades\DB::table('catalog.resource_services')->updateOrInsert(
                ['resource_id' => $resource->id, 'service_id' => $serviceId], ['is_active' => in_array($serviceId, $data['service_ids'], true), 'updated_at' => now(), 'created_at' => now()]
            );
        });
        return response()->json(['message' => 'Servicios del recurso actualizados.']);
    }
}
