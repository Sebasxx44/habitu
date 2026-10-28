<?php

namespace App\Modules\People\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\People\Services\ProfessionalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfessionalController extends Controller
{
    public function __construct(
        private ProfessionalService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['business_id', 'active']);
        $response = $this->service->all($filters, $request->user());
        return $response->toJsonResponse();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $response = $this->service->find($id, $request->user());
        return $response->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer|exists:pgsql.business.businesses,id',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'specialty' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'photo_url' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $response = $this->service->create($data);
        return $response->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'specialty' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'photo_url' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $response = $this->service->update($id, $data);
        return $response->toJsonResponse();
    }

    public function destroy(int $id): JsonResponse
    {
        $response = $this->service->delete($id);
        return $response->toJsonResponse();
    }

    public function availability(Request $request, int $id): JsonResponse
    {
        $date = $request->validate(['date' => 'nullable|date_format:Y-m-d'])['date'] ?? null;
        $profile = $this->service->find($id, $request->user());
        if (! $profile->success) return $profile->toJsonResponse();
        $response = $this->service->getAvailability($id, $date);
        return $response->toJsonResponse();
    }

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [\App\Models\User::ROLE_ADMIN, \App\Models\User::ROLE_SUPERADMIN], true), 403);
        $businessId = $request->input('business_id');
        if ($user->role !== \App\Models\User::ROLE_SUPERADMIN) {
            $businessIds = app(\App\Services\BusinessAccessService::class)->businessIds($user);
            $businessId = $businessId ? (int) $businessId : ($businessIds[0] ?? null);
            abort_unless($businessId && in_array($businessId, $businessIds, true), 403);
        }
        $response = $this->service->getStats($businessId);
        return $response->toJsonResponse();
    }
}
