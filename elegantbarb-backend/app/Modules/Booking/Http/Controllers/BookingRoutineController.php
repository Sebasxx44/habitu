<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Booking\Models\BookingRoutine;
use App\Modules\Booking\Services\BookingRoutineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class BookingRoutineController extends Controller
{
    public function __construct(private BookingRoutineService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeClient($request);
        return response()->json(['data' => BookingRoutine::where('user_id', $request->user()->id)->with('occurrences')->latest()->limit(50)->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeClient($request);
        $data = $request->validate(['appointment_id' => 'required|integer', 'name' => 'required|string|max:120', 'interval_weeks' => 'required|integer|min:1|max:52', 'count' => 'required|integer|min:1|max:12', 'start_date' => 'required|date_format:Y-m-d', 'start_time' => 'required|date_format:H:i']);
        return response()->json(['data' => $this->service->create($request->user(), $data)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeClient($request);
        $data = $request->validate(['name' => 'sometimes|required|string|max:120', 'status' => 'sometimes|in:ACTIVE,PAUSED', 'interval_weeks' => 'sometimes|integer|min:1|max:52|required_with:start_date', 'start_date' => 'sometimes|required|date_format:Y-m-d|required_with:start_time,interval_weeks', 'start_time' => 'sometimes|required|date_format:H:i|required_with:start_date']);
        return response()->json(['data' => $this->service->update($request->user(), $id, $data)]);
    }

    public function preview(Request $request, int $id): JsonResponse
    {
        $this->authorizeClient($request);
        return response()->json(['data' => $this->service->preview($request->user(), $id)]);
    }

    public function skip(Request $request, int $id): JsonResponse
    {
        $this->authorizeClient($request);
        return response()->json(['data' => $this->service->skip($request->user(), $id)]);
    }

    public function attach(Request $request, int $id): JsonResponse
    {
        $this->authorizeClient($request);
        $data = $request->validate(['appointment_id' => 'required|integer']);
        return response()->json(['data' => $this->service->attach($request->user(), $id, $data['appointment_id'])]);
    }

    private function authorizeClient(Request $request): void
    {
        abort_unless($request->user()->role === User::ROLE_CLIENT, 403);
    }
}
