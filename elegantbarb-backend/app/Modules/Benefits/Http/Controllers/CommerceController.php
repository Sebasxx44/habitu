<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Benefits\Models\ServiceGift;
use App\Modules\Benefits\Models\ServicePackage;
use App\Modules\Benefits\Services\ServiceGiftService;
use App\Modules\Benefits\Services\ServicePackageService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Services\BusinessAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class CommerceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['business_id' => 'nullable|integer|min:1']);
        $admin = in_array($request->user()->role, ['ADMIN_BARBERIA', 'SUPERADMIN'], true);
        abort_unless($admin || $request->user()->role === 'CLIENTE', 403);
        $businesses = Business::where('is_active', true)->when($admin && $request->user()->role !== 'SUPERADMIN',
            fn ($query) => $query->whereIn('id', app(BusinessAccessService::class)->businessIds($request->user())))
            ->orderBy('name')->limit(100)->get(['id', 'name']);
        $businessId = (int) ($request->business_id ?: $businesses->first()?->id);
        if ($businessId) abort_unless($businesses->contains('id', $businessId), 403);
        $gifts = ServiceGift::query()->when($admin, fn ($query) => $query->where('business_id', $businessId), fn ($query) => $query->where('recipient_user_id', $request->user()->id))
            ->orderByDesc('created_at')->limit(50)->get()->map(fn ($gift) => app(ServiceGiftService::class)->present($gift));
        return ServiceResponse::success(['businesses' => $businesses, 'business_id' => $businessId, 'can_manage' => $admin,
            'branches' => BusinessBranch::where('business_id', $businessId)->where('is_active', true)->get(['id', 'name']),
            'services' => Service::where('business_id', $businessId)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'duration_minutes']),
            'packages' => ServicePackage::where('business_id', $businessId)->where('is_active', true)->orderBy('name')->get(),
            'gifts' => $gifts, 'capabilities' => ['package_execution' => 'CONSECUTIVE', 'package_payment_mode' => 'ON_SITE',
                'gift_purchase_enabled' => false, 'gift_kind' => 'SERVICE', 'transferable_balance' => false]])->toJsonResponse();
    }

    public function package(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'required|integer|min:1', 'name' => 'required|string|max:150', 'description' => 'nullable|string|max:1000',
            'service_ids' => 'required|array|min:2|max:6', 'service_ids.*' => ['required', 'integer', 'distinct', Rule::exists(Service::class, 'id')->where('business_id', $request->business_id)]]);
        $this->authorizeBusiness($request->user(), (int) $data['business_id']);
        $data['service_ids'] = array_map(fn ($id) => (int) $id, $data['service_ids']);
        return ServiceResponse::success(ServicePackage::create($data), 'Paquete creado', 201)->toJsonResponse();
    }

    public function deactivatePackage(Request $request, int $id): JsonResponse
    {
        $package = ServicePackage::findOrFail($id);
        $this->authorizeBusiness($request->user(), $package->business_id);
        $package->update(['is_active' => false]);
        return ServiceResponse::success(null, 'Paquete desactivado. Las reservas existentes conservan sus condiciones.')->toJsonResponse();
    }

    public function preview(Request $request, int $id, ServicePackageService $service): JsonResponse
    {
        abort_unless($request->user()->role === 'CLIENTE', 403);
        $data = $request->validate(['branch_id' => 'required|integer|min:1', 'date' => 'required|date_format:Y-m-d', 'start_time' => 'required|date_format:H:i']);
        return ServiceResponse::success($service->present($service->preview($request->user(), ServicePackage::findOrFail($id), $data)))->toJsonResponse();
    }

    public function confirm(Request $request, string $id, ServicePackageService $service): JsonResponse
    {
        abort_unless($request->user()->role === 'CLIENTE', 403);
        $data = $request->validate(['accepted_terms' => 'required|accepted', 'idempotency_key' => 'required|uuid']);
        return ServiceResponse::success($service->present($service->confirm($request->user(), $id, $data['idempotency_key'])), 'Paquete confirmado; cada atención conserva su reserva y cancelación.')->toJsonResponse();
    }

    public function issueGift(Request $request, ServiceGiftService $service): JsonResponse
    {
        $data = $request->validate(['business_id' => 'required|integer|min:1', 'service_id' => 'required|integer|min:1',
            'expires_at' => 'required|date_format:Y-m-d|after:today', 'restrictions' => 'required|string|min:10|max:2000', 'idempotency_key' => 'required|uuid']);
        $this->authorizeBusiness($request->user(), (int) $data['business_id']);
        return ServiceResponse::success($service->present($service->issue($request->user(), $data)), 'Vale de servicio emitido por el negocio. No se ha registrado un cobro.', 201)->toJsonResponse();
    }

    public function claimGift(Request $request, ServiceGiftService $service): JsonResponse
    {
        abort_unless($request->user()->role === 'CLIENTE', 403);
        $data = $request->validate(['code' => 'required|uuid']);
        return ServiceResponse::success($service->present($service->claim($request->user(), $data['code'])), 'Vale vinculado a tu cuenta.')->toJsonResponse();
    }

    public function redeemGift(Request $request, ServiceGiftService $service): JsonResponse
    {
        $data = $request->validate(['code' => 'required|uuid', 'appointment_id' => 'required|integer|min:1']);
        $gift = ServiceGift::where('code', $data['code'])->firstOrFail();
        $this->authorizeBusiness($request->user(), $gift->business_id);
        return ServiceResponse::success($service->present($service->redeem($request->user(), $gift, (int) $data['appointment_id'])), 'Canje registrado en la atención completada.')->toJsonResponse();
    }

    private function authorizeBusiness(User $user, int $businessId): void
    {
        abort_unless($user->role === 'SUPERADMIN' || ($user->role === 'ADMIN_BARBERIA' && in_array($businessId, app(BusinessAccessService::class)->businessIds($user), true)), 403);
    }
}
