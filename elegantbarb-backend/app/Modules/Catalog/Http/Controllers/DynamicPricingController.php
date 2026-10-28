<?php

declare(strict_types=1);

namespace App\Modules\Catalog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\DynamicPricingRule;
use App\Modules\Catalog\Models\Service;
use App\Modules\Booking\Services\AvailabilityService;
use App\Services\BusinessAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DynamicPricingController extends Controller
{
    public function context(Request $request): JsonResponse
    {
        $this->authorizeUser($request);
        $businesses = Business::query()->when($request->user()->role !== User::ROLE_SUPERADMIN, fn ($query) => $query->whereIn('id', app(BusinessAccessService::class)->businessIds($request->user())))->orderBy('name')->get(['id', 'name']);
        $preferred = $businesses->firstWhere('id', (int) $request->user()->barber_shop_id);
        $id = (int) ($request->input('business_id') ?: $preferred?->id ?: $businesses->first()?->id);
        $business = $id ? $this->business($request, $id) : null;
        return response()->json(['businesses' => $businesses, 'business' => $business ? [
            'id' => $business->id, 'name' => $business->name,
            'services' => $business->services()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'price', 'duration_minutes', 'duration_mode', 'duration_options', 'booking_model'])->map(fn ($service) => [...$service->toArray(), 'price' => (float) $service->price]),
            'branches' => $business->branches()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ] : null, 'timezone' => config('booking.timezone'), 'currency' => 'COP']);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'required|integer']);
        $business = $this->business($request, (int) $data['business_id']);
        return response()->json(['data' => DynamicPricingRule::with('service:id,name')->where('business_id', $business->id)->orderByDesc('priority')->orderBy('id')->get()->map(fn ($rule) => $this->present($rule)), 'timezone' => config('booking.timezone')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateRule($request);
        $business = $this->business($request, (int) $data['business_id']);
        $rule = DB::transaction(function () use ($business, $data) {
            Business::whereKey($business->id)->lockForUpdate()->firstOrFail();
            return DynamicPricingRule::create($data);
        });
        return response()->json(['rule' => $this->present($rule->load('service:id,name'))], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $this->validateRule($request);
        $business = $this->business($request, (int) $data['business_id']);
        $rule = DB::transaction(function () use ($business, $data, $id) {
            Business::whereKey($business->id)->lockForUpdate()->firstOrFail();
            $rule = DynamicPricingRule::where('business_id', $business->id)->findOrFail($id);
            $rule->update($data);
            return $rule;
        });
        return response()->json(['rule' => $this->present($rule->load('service:id,name'))]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['business_id' => 'required|integer']);
        $business = $this->business($request, (int) $data['business_id']);
        DB::transaction(function () use ($business, $id) {
            Business::whereKey($business->id)->lockForUpdate()->firstOrFail();
            DynamicPricingRule::where('business_id', $business->id)->findOrFail($id)->delete();
        });
        return response()->json(['deleted' => true]);
    }

    public function calculate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer', 'service_id' => 'required|integer', 'branch_id' => 'required|integer',
            'date' => 'required|date_format:Y-m-d', 'duration_minutes' => 'nullable|integer|min:5|max:1440', 'participants' => 'nullable|integer|min:1|max:500',
        ]);
        $this->business($request, (int) $data['business_id']);
        $date = CarbonImmutable::parse($data['date'], config('booking.timezone'));
        if ($date->lt(CarbonImmutable::now(config('booking.timezone'))->startOfDay()) || $date->gt(CarbonImmutable::now(config('booking.timezone'))->addYear())) throw ValidationException::withMessages(['date' => 'Selecciona una fecha desde hoy y hasta un año.']);
        return response()->json(app(AvailabilityService::class)->slots(array_filter($data, fn ($value) => $value !== null)));
    }

    private function validateRule(Request $request): array
    {
        $this->authorizeUser($request);
        $data = $request->validate([
            'business_id' => 'required|integer', 'service_id' => 'nullable|integer', 'name' => 'required|string|max:100',
            'rule_type' => 'required|in:PEAK_HOUR,DAY_OF_WEEK', 'conditions' => 'required|array:days_of_week,time_start,time_end',
            'conditions.days_of_week' => 'required|array|min:1|max:7', 'conditions.days_of_week.*' => 'required|integer|between:0,6|distinct',
            'conditions.time_start' => 'required|date_format:H:i', 'conditions.time_end' => 'required|date_format:H:i|after:conditions.time_start',
            'multiplier' => ['required', 'numeric', 'between:0.1,5', 'decimal:0,2'], 'flat_adjustment' => ['required', 'numeric', 'between:-99999999,99999999', 'decimal:0,2'],
            'priority' => 'required|integer|between:0,10000', 'is_active' => 'required|boolean',
            'starts_at' => 'nullable|date_format:Y-m-d', 'ends_at' => 'nullable|date_format:Y-m-d'.($request->filled('starts_at') ? '|after_or_equal:starts_at' : ''),
        ]);
        $this->business($request, (int) $data['business_id']);
        if (! empty($data['service_id']) && ! Service::where('business_id', $data['business_id'])->whereKey($data['service_id'])->exists()) throw ValidationException::withMessages(['service_id' => 'El servicio no pertenece a este negocio.']);
        $data['timezone'] = config('booking.timezone', 'America/Bogota');
        foreach (['starts_at', 'ends_at'] as $field) if (! empty($data[$field])) {
            $date = CarbonImmutable::parse($data[$field], $data['timezone']);
            $data[$field] = ($field === 'ends_at' ? $date->endOfDay() : $date->startOfDay())->utc();
        }
        $data['name'] = trim($data['name']);
        if ($data['name'] === '') throw ValidationException::withMessages(['name' => 'Escribe un nombre para la regla.']);
        return $data;
    }

    private function authorizeUser(Request $request): void
    {
        abort_unless($request->user() && in_array($request->user()->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true) && $request->user()->hasEffectivePermission('settings.manage'), 403);
    }

    private function business(Request $request, int $id): Business
    {
        $this->authorizeUser($request);
        $business = Business::findOrFail($id);
        abort_unless(app(BusinessAccessService::class)->canAccess($request->user(), $business), 403);
        return $business;
    }

    private function present(DynamicPricingRule $rule): array
    {
        $conditions = $rule->conditions ?? [];
        return ['id' => $rule->id, 'business_id' => $rule->business_id, 'service_id' => $rule->service_id, 'service_name' => $rule->service?->name,
            'name' => $rule->name ?: $rule->rule_type, 'rule_type' => $rule->rule_type, 'supported' => app(\App\Modules\Catalog\Services\DynamicPricingService::class)->supports($rule),
            'conditions' => ['days_of_week' => $conditions['days_of_week'] ?? (isset($conditions['day_of_week']) ? [(int) $conditions['day_of_week']] : range(0, 6)),
                'time_start' => $conditions['time_start'] ?? sprintf('%02d:00', $conditions['hour_start'] ?? 0), 'time_end' => $conditions['time_end'] ?? (isset($conditions['hour_end']) && (int) $conditions['hour_end'] < 23 ? sprintf('%02d:00', (int) $conditions['hour_end'] + 1) : '23:59')],
            'multiplier' => (float) $rule->multiplier, 'flat_adjustment' => (float) ($rule->flat_adjustment ?? 0), 'priority' => (int) $rule->priority, 'is_active' => $rule->is_active,
            'starts_at' => $rule->starts_at?->setTimezone($rule->timezone)->format('Y-m-d'), 'ends_at' => $rule->ends_at?->setTimezone($rule->timezone)->format('Y-m-d'), 'timezone' => $rule->timezone];
    }
}
