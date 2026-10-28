<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Booking\Services\SmartQueueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmartQueueController extends Controller
{
    public function __construct(private SmartQueueService $service) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')]]);
        $businessId = (int) $data['business_id'];
        $res = $this->service->getByBusiness($businessId);

        return $res->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')],
            'branch_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\BusinessBranch::class, 'id')],
            'name' => 'nullable|string|max:100',
        ]);

        $res = $this->service->createQueue($data['business_id'], $data['branch_id'] ?? null, $data['name'] ?? 'Fila Principal');

        return $res->toJsonResponse();
    }

    public function join(Request $request, int $queueId): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Client::class, 'id')],
        ]);

        $res = $this->service->joinQueue($queueId, $data['client_id']);

        return $res->toJsonResponse();
    }

    public function callNext(int $queueId): JsonResponse
    {
        $res = $this->service->callNext($queueId);

        return $res->toJsonResponse();
    }

    public function startServing(int $entryId): JsonResponse
    {
        $res = $this->service->startServing($entryId);

        return $res->toJsonResponse();
    }

    public function complete(int $entryId): JsonResponse
    {
        $res = $this->service->completeEntry($entryId);

        return $res->toJsonResponse();
    }

    public function cancel(int $entryId): JsonResponse
    {
        $res = $this->service->cancelEntry($entryId);

        return $res->toJsonResponse();
    }

    public function show(int $queueId): JsonResponse
    {
        $res = $this->service->getQueueStatus($queueId);

        return $res->toJsonResponse();
    }

    public function createDisplay(Request $request, int $queueId): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $res = $this->service->createDisplay($queueId, $data['name']);

        return $res->toJsonResponse();
    }
}
