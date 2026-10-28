<?php

namespace App\Modules\Subscriptions\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Subscriptions\Services\MembershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MembershipController extends Controller
{
    public function __construct(private MembershipService $service) {}

    public function plans(Request $request): JsonResponse
    {
        $businessId = $request->input('business_id');
        $res = $this->service->getPlans($businessId);

        return $res->toJsonResponse();
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')],
            'name' => 'required|string|max:100',
            'slug' => 'required|string|max:100',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'billing_cycle' => 'nullable|string|in:MONTHLY,QUARTERLY,YEARLY',
            'appointments_included' => 'nullable|integer|min:0',
            'included_services' => 'nullable|array',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'benefits' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $res = $this->service->createPlan($data);

        return $res->toJsonResponse();
    }

    public function updatePlan(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'appointments_included' => 'nullable|integer|min:0',
        ]);

        $res = $this->service->updatePlan($id, $data);

        return $res->toJsonResponse();
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Client::class, 'id')],
            'plan_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Subscriptions\Models\MembershipPlan::class, 'id')],
        ]);

        $res = $this->service->subscribe($data['client_id'], $data['plan_id']);

        return $res->toJsonResponse();
    }

    public function myMemberships(Request $request): JsonResponse
    {
        $clientId = $request->input('client_id');
        $res = $this->service->getMyMemberships($clientId);

        return $res->toJsonResponse();
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $clientId = $request->input('client_id');
        $res = $this->service->cancelMembership($id, $clientId);

        return $res->toJsonResponse();
    }
}
