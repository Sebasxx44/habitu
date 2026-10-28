<?php

namespace App\Modules\Catalog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Catalog\Models\Service;
use App\Core\DTOs\ServiceResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::with(['business', 'category', 'resources'])
            ->when($request->business_id, fn($q, $id) => $q->where('business_id', $id))
            ->when($request->active !== null, fn($q, $v) => $q->where('is_active', $v));
        return ServiceResponse::success($query->paginate(50), 'Servicios obtenidos')->toJsonResponse();
    }

    public function show($id)
    {
        $svc = Service::with(['business', 'category', 'resources'])->find($id);
        if (!$svc) return ServiceResponse::error('Servicio no encontrado', null, 404)->toJsonResponse();
        return ServiceResponse::success($svc->load('resources'), 'Servicio obtenido')->toJsonResponse();
    }

    public function store(Request $request)
    {
        $data = $request->validate(array_merge(\App\Modules\Catalog\Services\ServiceBookingConfiguration::rules(), [
            'business_id' => 'required|exists:pgsql.business.businesses,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'duration_minutes' => 'required|integer|min:1|max:1440',
            'category' => 'nullable|string|max:120',
            'image_url' => 'nullable|string|max:3000000',
            'media_gallery' => 'nullable|array|max:12',
            'media_gallery.*.url' => 'required|string|max:3000000',
            'media_gallery.*.type' => 'required|in:image,video',
            'media_gallery.*.caption' => 'nullable|string|max:300',
            'is_active' => 'boolean',
            'requires_professional' => 'boolean',
        ]));
        $data = app(\App\Modules\Catalog\Services\ServiceBookingConfiguration::class)->normalize($data, (int) $data['business_id']);
        $data = $this->withCategory($data, (int) $data['business_id']);
        $resources = $data['resource_ids'] ?? []; unset($data['resource_ids']);
        $svc = \DB::transaction(function () use ($data, $resources) {
            $service = Service::create($data); $service->resources()->sync($resources); return $service;
        });
        return ServiceResponse::success($svc->load('resources'), 'Servicio creado', 201)->toJsonResponse();
    }

    public function update(Request $request, $id)
    {
        $svc = Service::find($id);
        if (!$svc) return ServiceResponse::error('Servicio no encontrado', null, 404)->toJsonResponse();
        $data = $request->validate(array_merge(\App\Modules\Catalog\Services\ServiceBookingConfiguration::rules(), [
            'name' => 'sometimes|required|string|max:255', 'description' => 'nullable|string|max:5000',
            'price' => 'sometimes|required|numeric|min:0', 'duration_minutes' => 'sometimes|required|integer|min:1|max:1440',
            'is_active' => 'sometimes|boolean',
            'requires_professional' => 'sometimes|boolean',
            'category' => 'nullable|string|max:120',
            'image_url' => 'nullable|string|max:3000000',
            'media_gallery' => 'nullable|array|max:12',
            'media_gallery.*.url' => 'required|string|max:3000000',
            'media_gallery.*.type' => 'required|in:image,video',
            'media_gallery.*.caption' => 'nullable|string|max:300',
        ]));
        $data = app(\App\Modules\Catalog\Services\ServiceBookingConfiguration::class)->normalize($data, (int) $svc->business_id, $svc);
        $resources = $data['resource_ids'] ?? null; unset($data['resource_ids']);
        \DB::transaction(function () use ($svc, $data, $resources) {
            $svc->update($this->withCategory($data, (int) $svc->business_id));
            if ($resources !== null) $svc->resources()->sync($resources);
        });
        return ServiceResponse::success($svc->load('resources'), 'Servicio actualizado')->toJsonResponse();
    }

    public function destroy($id)
    {
        $svc = Service::find($id);
        if (!$svc) return ServiceResponse::error('Servicio no encontrado', null, 404)->toJsonResponse();
        $svc->delete();
        return ServiceResponse::success(null, 'Servicio eliminado')->toJsonResponse();
    }
    public function stats(Request $request, int $id, \App\Modules\Catalog\Services\ServiceAnalytics $analytics)
    {
        $service = Service::findOrFail($id);
        abort_unless(in_array($request->user()->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true)
            && app(\App\Services\BusinessAccessService::class)->canAccess($request->user(), $service), 403);
        return ServiceResponse::success($analytics->overview($service), 'Estadísticas del servicio')->toJsonResponse();
    }

    private function withCategory(array $data, int $businessId): array
    {
        if (!empty($data['category'])) {
            $data['service_category_id'] = \App\Modules\Catalog\Models\ServiceCategory::firstOrCreate([
                'business_id' => $businessId, 'name' => $data['category'],
            ])->id;
        }
        unset($data['category']);
        return $data;
    }

}
