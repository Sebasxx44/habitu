<?php

namespace App\Modules\Business\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Services\PublicCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PublicCatalogController extends Controller
{
    public function __construct(private PublicCatalogService $catalog, private AvailabilityService $availability) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate(['category_id' => 'nullable|integer|min:1', 'search' => 'nullable|string|max:150']);
        return $this->catalog->all($filters)->toJsonResponse();
    }

    public function show(int $id): JsonResponse
    {
        return $this->catalog->find($id)->toJsonResponse();
    }

    public function bySlug(string $slug): JsonResponse
    {
        return $this->catalog->bySlug($slug)->toJsonResponse();
    }

    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer|min:1', 'branch_id' => 'required|integer|min:1',
            'service_id' => 'required|integer|min:1', 'professional_id' => 'nullable|integer|min:1',
            'resource_id' => 'nullable|integer|min:1', 'date' => 'required|date_format:Y-m-d',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'time_from' => 'nullable|date_format:H:i', 'time_to' => 'nullable|date_format:H:i',
            'appointment_id' => 'prohibited', 'client_id' => 'prohibited', 'client_user_id' => 'prohibited',
        ]);
        if (isset($data['time_from'], $data['time_to']) && $data['time_to'] < $data['time_from']) {
            throw \Illuminate\Validation\ValidationException::withMessages(['time_to' => 'La hora final debe ser posterior a la inicial.']);
        }
        return ServiceResponse::success($this->availability->slots($data))->toJsonResponse();
    }
}
