<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Booking\Services\GroupCoordinationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class GroupCoordinationController extends Controller
{
    public function __construct(private GroupCoordinationService $service) {}

    public function index(Request $request): JsonResponse { return ServiceResponse::success($this->service->list($request->user()))->toJsonResponse(); }
    public function show(Request $request, int $id): JsonResponse { return ServiceResponse::success($this->service->show($request->user(), $id))->toJsonResponse(); }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => 'required|string|max:120', 'appointment_id' => 'nullable|integer|min:1',
            'member_limit' => 'required|integer|min:2|max:100', 'expires_at' => 'required|date|after:now|before:'.now()->addDays(90)->toIso8601String(),
            'options' => 'nullable|array|max:6', 'options.*' => 'required|string|distinct|max:160']);
        return ServiceResponse::success($this->service->create($request->user(), $data), 'Grupo creado', 201)->toJsonResponse();
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|size:48']);
        return ServiceResponse::success($this->service->join($request->user(), $data['token']))->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['appointment_id' => 'sometimes|integer|min:1', 'status' => 'sometimes|in:CLOSED']);
        return ServiceResponse::success($this->service->update($request->user(), $id, $data))->toJsonResponse();
    }

    public function invitation(Request $request, int $id): JsonResponse { return ServiceResponse::success($this->service->invitation($request->user(), $id))->toJsonResponse(); }

    public function respond(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['response' => 'required|in:CONFIRMED,DECLINED', 'option_id' => 'nullable|integer|min:1']);
        return ServiceResponse::success($this->service->respond($request->user(), $id, $data['response'], $data['option_id'] ?? null))->toJsonResponse();
    }
}
