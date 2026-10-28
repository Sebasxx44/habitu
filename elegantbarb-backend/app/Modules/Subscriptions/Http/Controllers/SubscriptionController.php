<?php

namespace App\Modules\Subscriptions\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        private SubscriptionService $service
    ) {}

    public function plans(): JsonResponse
    {
        $response = $this->service->getPlans();

        return $response->toJsonResponse();
    }

    public function mySubscription(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $response = $this->service->getMySubscription($userId);

        return $response->toJsonResponse();
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Subscriptions\Models\Plan::class, 'id')],
            'auto_renew' => 'sometimes|nullable|declined',
            'idempotency_key' => 'required|uuid',
            'payment_method' => 'nullable|in:WALLET',
            'external_subscription_id' => 'prohibited',
        ]);

        $userId = (int) $request->user()->id;
        $meta = [
            'auto_renew' => $data['auto_renew'] ?? false,
            'payment_method' => $data['payment_method'] ?? null,
            'idempotency_key' => $data['idempotency_key'],
        ];

        $response = $this->service->subscribe($userId, (int) $data['plan_id'], $meta);

        return $response->toJsonResponse();
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'nullable|string|max:255']);
        $reason = $data['reason'] ?? '';

        $response = $this->service->cancel($id, $reason, (int) $request->user()->id);

        return $response->toJsonResponse();
    }

    public function usageHistory(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;
        $limit = (int) $request->input('limit', 50);

        $response = $this->service->getUsageHistory($userId, $limit);

        return $response->toJsonResponse();
    }
}
