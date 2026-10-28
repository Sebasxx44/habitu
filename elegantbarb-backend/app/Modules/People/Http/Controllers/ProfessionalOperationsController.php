<?php

namespace App\Modules\People\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\OperationalBlock;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Professional;
use App\Modules\People\Services\OperationsAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ProfessionalOperationsController extends Controller
{
    public function __construct(private OperationsAccess $access) {}

    public function context(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'nullable|integer']);
        $businessIds = app(\App\Services\BusinessAccessService::class)->businessIds($request->user());
        $business = $this->access->business($request->user(), $data['business_id'] ?? ($businessIds[0] ?? 0));
        $own = $request->user()->role === User::ROLE_PROFESSIONAL;
        $professionals = Professional::where('business_id', $business->id)->when($own, fn ($query) => $query->where('user_id', $request->user()->id))
            ->with('availability')->get(['id', 'name', 'business_id', 'user_id']);
        return response()->json(['data' => [
            'business' => $business->only(['id', 'name']),
            'businesses' => \App\Modules\Business\Models\Business::whereIn('id', $request->user()->role === User::ROLE_SUPERADMIN ? [$business->id] : $businessIds)->get(['id', 'name']),
            'timezone' => config('booking.timezone'),
            'professionals' => $professionals,
            'branches' => BusinessBranch::where('business_id', $business->id)->where('is_active', true)->get(['id', 'name']),
            'services' => Service::where('business_id', $business->id)->where('is_active', true)->get(['id', 'name', 'duration_minutes']),
            'service_links' => DB::table('catalog.professional_services')->whereIn('professional_id', $professionals->pluck('id'))->get(['professional_id', 'branch_id', 'service_id', 'is_active']),
            'resources' => Resource::where('business_id', $business->id)->get(['id', 'branch_id', 'name', 'type', 'capacity', 'is_active']),
            'resource_links' => DB::table('catalog.resource_services')->whereIn('resource_id', Resource::where('business_id', $business->id)->select('id'))->where('is_active', true)->get(['resource_id', 'service_id']),
            'blocks' => OperationalBlock::where('business_id', $business->id)->where('ends_at', '>', now())
                ->when($own, fn ($query) => $query->whereIn('professional_id', $professionals->pluck('id')))->orderBy('starts_at')->get(),
            'can_manage_resources' => in_array($request->user()->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true),
            'today' => $this->today($business->id, $own ? $professionals->pluck('id')->all() : null),
        ]]);
    }

    private function today(int $businessId, ?array $professionalIds): array
    {
        $now = CarbonImmutable::now(config('booking.timezone'));
        $appointments = Appointment::where('business_id', $businessId)->whereDate('date', $now->toDateString())
            ->when($professionalIds !== null, fn ($query) => $query->whereIn('professional_id', $professionalIds))
            ->with('client:id,name', 'service:id,name', 'professional:id,name', 'resource:id,name')->orderBy('start_time')->get();
        return [
            'date' => $now->toDateString(), 'time' => $now->format('H:i:s'),
            'appointments' => $appointments->map(fn (Appointment $appointment) => [
                'id' => $appointment->id, 'branch_id' => $appointment->branch_id, 'professional_id' => $appointment->professional_id,
                'resource_id' => $appointment->resource_id, 'start_time' => $appointment->getRawOriginal('start_time'), 'end_time' => $appointment->getRawOriginal('end_time'),
                'status' => $appointment->status->value, 'payment_status' => $appointment->payment_status,
                'checked_in_at' => $appointment->checked_in_at, 'participants' => $appointment->participants,
                'client_name' => $appointment->client?->name, 'service_name' => $appointment->service?->name,
                'professional_name' => $appointment->professional?->name, 'resource_name' => $appointment->resource?->name,
            ]),
            'unassigned' => $professionalIds !== null ? 0 : \App\Modules\OnDemand\Models\OnDemandRequest::where('business_id', $businessId)->where('status', 'SEARCHING')
                ->whereNull('professional_id')->where('search_expires_at', '>', now())->count(),
        ];
    }

    public function schedule(Request $request, int $id): JsonResponse
    {
        $professional = $this->access->professional($request->user(), $id, true);
        $data = $request->validate([
            'branch_id' => 'required|integer', 'slots' => 'required|array|size:7',
            'slots.*.day_of_week' => 'required|integer|min:0|max:6|distinct', 'slots.*.is_available' => 'required|boolean',
            'slots.*.start_time' => 'required|date_format:H:i', 'slots.*.end_time' => 'required|date_format:H:i',
            'slots.*.break_start_time' => 'nullable|date_format:H:i', 'slots.*.break_end_time' => 'nullable|date_format:H:i',
        ]);
        BusinessBranch::where('business_id', $professional->business_id)->findOrFail($data['branch_id']);
        foreach ($data['slots'] as $slot) {
            if ($slot['end_time'] <= $slot['start_time']) throw ValidationException::withMessages(['slots' => 'El cierre debe ser posterior al inicio.']);
            $start = $slot['break_start_time'] ?? null; $end = $slot['break_end_time'] ?? null;
            if (($start || $end) && (! $start || ! $end || $end <= $start || $start < $slot['start_time'] || $end > $slot['end_time'])) {
                throw ValidationException::withMessages(['slots' => 'El descanso debe quedar dentro del horario de atención.']);
            }
        }
        DB::transaction(fn () => $this->saveSchedule($professional, $data));
        return response()->json(['data' => $professional->availability()->get()]);
    }

    private function saveSchedule(Professional $professional, array $data): void
    {
        // Same branch -> professional lock order as reservation writes.
        BusinessBranch::where('business_id', $professional->business_id)->orderBy('id')->lockForUpdate()->get();
        Professional::whereKey($professional->id)->lockForUpdate()->firstOrFail();
        $slots = collect($data['slots'])->keyBy('day_of_week');
        $otherSchedules = $professional->availability()->where('branch_id', '!=', $data['branch_id'])->where('is_available', true)->get();
        foreach ($data['slots'] as $slot) {
            if ($slot['is_available'] && $otherSchedules->contains(fn ($other) => $other->day_of_week === $slot['day_of_week'] && $other->start_time < $slot['end_time'].':00' && $other->end_time > $slot['start_time'].':00')) {
                throw ValidationException::withMessages(['slots' => 'El horario se cruza con otra sede.']);
            }
        }
        $conflicts = $professional->appointments()->where('branch_id', $data['branch_id'])->whereDate('date', '>=', CarbonImmutable::now(config('booking.timezone'))->toDateString())
            ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->get()->filter(function (Appointment $appointment) use ($slots) {
                $slot = $slots->get($appointment->date->dayOfWeek);
                $start = $appointment->getRawOriginal('start_time'); $end = $appointment->getRawOriginal('end_time');
                return ! $slot['is_available'] || $start < $slot['start_time'].':00' || $end > $slot['end_time'].':00'
                    || (! empty($slot['break_start_time']) && $start < $slot['break_end_time'].':00' && $end > $slot['break_start_time'].':00');
            })->pluck('id')->all();
        if ($conflicts) throw ValidationException::withMessages(['appointments' => 'Revisa primero las reservas afectadas: '.implode(', ', $conflicts).'.']);
        foreach ($data['slots'] as $slot) $professional->availability()->updateOrCreate(['branch_id' => $data['branch_id'], 'day_of_week' => $slot['day_of_week']], $slot);
    }

    public function services(Request $request, int $id): JsonResponse
    {
        $professional = $this->access->professional($request->user(), $id, true);
        $data = $request->validate(['branch_id' => 'required|integer', 'service_ids' => 'present|array|max:100', 'service_ids.*' => 'integer|distinct']);
        BusinessBranch::where('business_id', $professional->business_id)->findOrFail($data['branch_id']);
        $available = Service::where('business_id', $professional->business_id)->where('is_active', true)->pluck('id');
        abort_unless(collect($data['service_ids'])->diff($available)->isEmpty(), 422, 'Selecciona servicios de este negocio.');
        DB::transaction(fn () => $this->saveServices($professional, $data, $available->all()));
        return response()->json(['message' => 'Servicios actualizados.']);
    }

    private function saveServices(Professional $professional, array $data, array $serviceIds): void
    {
        BusinessBranch::where('business_id', $professional->business_id)->orderBy('id')->lockForUpdate()->get();
        Professional::whereKey($professional->id)->lockForUpdate()->firstOrFail();
        abort_if($professional->appointments()->where('branch_id', $data['branch_id'])->whereDate('date', '>=', today())
            ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->whereNotIn('service_id', $data['service_ids'])->exists(), 409, 'Hay reservas futuras para los servicios que quieres retirar.');
        // Explicit inactive links avoid the booking engine legacy fallback after clearing all services.
        foreach ($serviceIds as $serviceId) DB::table('catalog.professional_services')->updateOrInsert(
            ['professional_id' => $professional->id, 'branch_id' => $data['branch_id'], 'service_id' => $serviceId],
            ['is_active' => in_array($serviceId, $data['service_ids'], true), 'updated_at' => now(), 'created_at' => now()]
        );
    }
}
