<?php

namespace App\Modules\Business\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use App\Http\Controllers\Controller;
use App\Modules\Business\Services\BusinessService;
use App\Services\UploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessController extends Controller
{
    public function __construct(
        private BusinessService $service,
        private UploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['category_id', 'active', 'search']);
        $response = $this->service->all($filters);
        return $response->toJsonResponse();
    }

    public function show(int $id): JsonResponse
    {
        $response = $this->service->find($id);
        return $response->toJsonResponse();
    }

    public function bySlug(string $slug): JsonResponse
    {
        $business = \App\Modules\Business\Models\Business::where('slug', $slug)->where('is_active', true)->firstOrFail();
        return $this->service->find($business->id)->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_category_id' => 'required|integer|exists:pgsql.platform.business_categories,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:pgsql.business.businesses,slug',
            'description' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'tax_id' => 'nullable|string|max:100',
            'logo_url' => 'nullable|string',
            'logo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'banner_url' => 'nullable|string',
            'primary_color' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'uses_professionals' => 'boolean',
            'uses_resources' => 'boolean',
            'services' => 'nullable|array',
            'services.*.name' => 'required_with:services|string|max:255',
            'services.*.price' => 'required_with:services|numeric|min:0',
            'services.*.duration' => 'required_with:services|integer|min:1',
            'professionals' => 'nullable|array',
            'professionals.*.name' => 'required_with:professionals|string|max:255',
            'professionals.*.specialty' => 'nullable|string|max:255',
            'resources' => 'nullable|array',
            'resources.*.name' => 'required_with:resources|string|max:255',
            'resources.*.description' => 'nullable|string',
            'resources.*.type' => 'nullable|string|in:ROOM,SPACE,COURT,STATION,TABLE,EQUIPMENT,OTHER',
            'schedule' => 'nullable|array',
            'schedule.*' => 'required|array:open,close,closed',
            'schedule.*.open' => 'required|date_format:H:i',
            'schedule.*.close' => 'required|date_format:H:i|after:schedule.*.open',
            'schedule.*.closed' => 'required|boolean',
        ]);

        $data['owner_user_id'] = $request->user()->id;

        if ($request->hasFile('logo')) {
            try {
                $this->uploadService->validateImage($request->file('logo'));
                $data['logo_url'] = $this->uploadService->store($request->file('logo'), 'business/logos');
            } catch (\InvalidArgumentException $e) {
                return ServiceResponse::error($e->getMessage(), 'Validation failed', 422)->toJsonResponse();
            }
        }

        $response = $this->service->create($data);
        return $response->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if (is_string($request->input('opening_hours'))) {
            $request->merge(['opening_hours' => json_decode($request->input('opening_hours'), true)]);
        }
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'logo_url' => 'nullable|string',
            'logo' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120',
            'banner_url' => 'nullable|string',
            'primary_color' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
            'address' => 'sometimes|required|string|max:500',
            'lat' => 'sometimes|nullable|numeric|between:-90,90',
            'lng' => 'sometimes|nullable|numeric|between:-180,180',
            'instagram' => 'sometimes|nullable|string|max:500',
            'whatsapp' => 'sometimes|nullable|string|max:100',
            'opening_hours' => 'sometimes|required|array:Dom,Lun,Mar,Mie,Jue,Vie,Sab',
            'opening_hours.*' => 'required|array:active,start,end',
            'opening_hours.*.active' => 'required|boolean',
            'opening_hours.*.start' => 'required|date_format:H:i',
            'opening_hours.*.end' => 'required|date_format:H:i|after:opening_hours.*.start',
        ]);

        if ($request->hasFile('logo')) {
            try {
                $this->uploadService->validateImage($request->file('logo'));
                $data['logo_url'] = $this->uploadService->store($request->file('logo'), 'business/logos');
            } catch (\InvalidArgumentException $e) {
                return ServiceResponse::error($e->getMessage(), 'Validation failed', 422)->toJsonResponse();
            }
        }

        $response = $this->service->update($id, $data);
        return $response->toJsonResponse();
    }

    public function destroy(int $id): JsonResponse
    {
        $response = $this->service->delete($id);
        return $response->toJsonResponse();
    }

    public function search(Request $request): JsonResponse
    {
        if ($request->filled('booking_mode') && ! $request->filled('booking_model')) $request->merge(['booking_model' => $request->booking_mode]);
        $filters = $request->validate([
            'booking_model' => 'nullable|in:professional,resource,direct,optional_professional,capacity',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'resource_id' => 'nullable|integer|min:1', 'resource_type' => 'nullable|string|max:50',
            'sport_type' => 'nullable|string|max:80', 'surface' => 'nullable|string|max:80', 'covered' => 'nullable|boolean',
            'q' => 'nullable|string|max:150', 'zone' => 'nullable|string|max:150',
            'category_id' => 'nullable|integer|min:1', 'service_id' => 'nullable|integer|min:1', 'professional_id' => 'nullable|integer|min:1',
            'min_price' => 'nullable|numeric|min:0', 'max_price' => 'nullable|numeric|min:0', 'min_rating' => 'nullable|numeric|between:0,5',
            'lat' => 'nullable|numeric|between:-90,90|required_with:lng,radius', 'lng' => 'nullable|numeric|between:-180,180|required_with:lat,radius',
            'radius' => 'nullable|numeric|gt:0|max:300', 'date' => 'nullable|date_format:Y-m-d|required_with:date_to',
            'date_to' => 'nullable|date_format:Y-m-d|after_or_equal:date',
            'time_from' => 'nullable|date_format:H:i', 'time_to' => 'nullable|date_format:H:i',
            'available' => 'nullable|boolean', 'promotions' => 'nullable|boolean',
            'sort' => 'nullable|in:recommended,rating,price,distance,newest,popular', 'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:24',
        ]);
        if (isset($filters['time_from'], $filters['time_to']) && $filters['time_to'] < $filters['time_from']) throw \Illuminate\Validation\ValidationException::withMessages(['time_to' => 'La hora final debe ser posterior a la inicial.']);
        if (isset($filters['min_price'], $filters['max_price']) && $filters['max_price'] < $filters['min_price']) throw \Illuminate\Validation\ValidationException::withMessages(['max_price' => 'El máximo debe ser mayor o igual al mínimo.']);
        if (! empty($filters['date_to']) && \Carbon\CarbonImmutable::parse($filters['date_to'])->gt(\Carbon\CarbonImmutable::parse($filters['date'])->addDays(6))) {
            throw \Illuminate\Validation\ValidationException::withMessages(['date_to' => 'Selecciona un rango máximo de siete días.']);
        }
        return app(\App\Modules\Business\Services\DiscoveryService::class)->search(array_filter($filters, fn ($value) => $value !== null && $value !== ''))->toJsonResponse();
    }

    public function intent(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => 'required|string|max:500', 'locale' => 'nullable|in:es,en']);
        $intent = app(\App\Modules\Platform\Services\BookingAssistantIntent::class)->resolve($data['q'], null, [], ['locale' => $data['locale'] ?? 'es']);
        return ServiceResponse::success($intent)->toJsonResponse();
    }

    public function suggestions(Request $request): JsonResponse
    {
        $data = $request->validate(['q' => 'required|string|max:100']);
        return app(\App\Modules\Business\Services\DiscoveryService::class)->suggestions($data['q'])->toJsonResponse();
    }

    public function categories(): JsonResponse
    {
        $categories = \App\Modules\Platform\Models\BusinessCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'icon', 'color', 'description']);
        return response()->json([
            'success' => true,
            'data' => $categories,
            'message' => 'Categorías obtenidas',
        ]);
    }
}
