<?php

declare(strict_types=1);

namespace App\Modules\Booking\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AvailabilityService
{
    private array $windows = [];
    private array $prepared = [];
    private array $candidateIds = [];
    private ?AvailabilitySnapshot $snapshot = null;
    private array $operationalDays = [];
    private array $operationalSchedules = [];
    private array $calendarDays = [];

    /** @param list<int> $businessIds */
    public function prime(array $businessIds, string $from, string $to): void
    {
        $this->windows = $this->prepared = $this->candidateIds = [];
        $this->operationalDays = $this->operationalSchedules = [];
        $this->calendarDays = [];
        $this->snapshot = new AvailabilitySnapshot($businessIds, $from, $to);
    }

    public function prepare(array $data, bool $lock = false): array
    {
        $cacheKey = implode(':', [$data['business_id'], $data['branch_id'], $data['service_id'], $data['professional_id'] ?? 0, $data['resource_id'] ?? 0, $data['duration_minutes'] ?? 0, $data['participants'] ?? 1, (int) ($data['_retain_legacy_professional'] ?? false)]);
        if (! $lock && isset($this->prepared[$cacheKey])) return array_replace($data, $this->prepared[$cacheKey]);
        $branch = $this->snapshot && ! $lock ? $this->snapshot->branches->get($data['branch_id']) : BusinessBranch::whereKey($data['branch_id'])->where('business_id', $data['business_id'])
            ->whereNull('deleted_at')->whereHas('business', fn ($q) => $q->where('is_active', true))
            ->where('is_active', true)->when($lock, fn ($q) => $q->lockForUpdate())->first();
        $service = $this->snapshot && ! $lock ? $this->snapshot->services->get($data['service_id']) : Service::whereKey($data['service_id'])->where('business_id', $data['business_id'])->where('is_active', true)->first();
        if (! $branch || ! $service || (int) $branch->business_id !== (int) $data['business_id'] || (int) $service->business_id !== (int) $data['business_id'] || $service->duration_minutes <= 0) $this->invalid('service_id', 'La sede o el servicio no están disponibles en este negocio.');
        $model = BookingRules::model($service, $this->snapshot?->businesses->get($data['business_id']));
        if (in_array($model, ['professional', 'optional_professional'], true) && empty($data['professional_id'])) $this->invalid('professional_id', 'No hay un profesional elegible para este servicio.');
        $professional = empty($data['professional_id']) ? null : ($this->snapshot && ! $lock ? $this->snapshot->professionals->get($data['professional_id']) : Professional::whereKey($data['professional_id'])
            ->where('business_id', $data['business_id'])->where('is_active', true)->when($lock, fn ($q) => $q->lockForUpdate())->first());
        if (! empty($data['professional_id']) && (! $professional || (int) $professional->business_id !== (int) $data['business_id'])) $this->invalid('professional_id', 'El profesional no está disponible en este negocio.');
        $resource = empty($data['resource_id']) ? null : ($this->snapshot && ! $lock ? $this->snapshot->resources->get($data['resource_id']) : Resource::whereKey($data['resource_id'])->where('branch_id', $branch->id)
            ->where('business_id', $data['business_id'])->where('is_active', true)->when($lock, fn ($q) => $q->lockForUpdate())->first());
        if (! empty($data['resource_id']) && (! $resource || (int) $resource->branch_id !== (int) $branch->id)) {
            $this->invalid('resource_id', 'El recurso no está disponible en esta sede.');
        }
        $branchServices = $this->snapshot && ! $lock ? $this->snapshot->branchServices->get($service->id, collect())
            : DB::table('catalog.branch_services')->where('service_id', $service->id)->get();
        $branchService = $branchServices->firstWhere('branch_id', $branch->id);
        if (($branchService && ! $branchService->is_active) || (! $branchService && $branchServices->isNotEmpty())) $this->invalid('service_id', 'El servicio no está habilitado en esta sede.');
        $links = $this->snapshot && ! $lock ? $this->snapshot->professionalServices->get($service->id, collect())
            : DB::table('catalog.professional_services')->where('service_id', $service->id)->get();
        $professionalService = $professional ? $links->where('professional_id', $professional->id)->firstWhere('branch_id', $branch->id) : null;
        if ($professional && (($professionalService && ! $professionalService->is_active) || (! $professionalService && $links->isNotEmpty()))) {
            $this->invalid('professional_id', 'El profesional no ofrece este servicio en esta sede.');
        }
        if ($resource) {
            $resourceLinks = $this->snapshot && ! $lock ? $this->snapshot->resourceServices->get($service->id, collect())
                : DB::table('catalog.resource_services')->where('service_id', $service->id)->get();
            if (! $resourceLinks->where('is_active', true)->contains('resource_id', $resource->id)) $this->invalid('resource_id', 'El recurso no está vinculado a este servicio.');
        }
        if ($model === 'resource') {
            if (! $resource) $this->invalid('resource_id', 'Selecciona un recurso disponible para este servicio.');
            if ($professional && ! $service->resource_professional_optional && empty($data['_retain_legacy_professional'])) $this->invalid('professional_id', 'Este servicio se reserva por recurso y no requiere profesional.');
        } elseif (in_array($model, ['direct', 'capacity'], true) && ($professional || $resource)) {
            // Keep a legacy resource request working until its service has an explicit booking model.
            if ($service->getRawOriginal('booking_model') !== null) $this->invalid('resource_id', 'Este servicio se reserva directamente, sin recurso ni profesional.');
            if ($resource) $model = 'resource';
        }
        $participants = (int) ($data['participants'] ?? 1);
        if ($participants < 1 || ($model !== 'capacity' && $participants !== 1) || ($model === 'capacity' && $participants > $service->booking_capacity)) $this->invalid('participants', 'El número de cupos no es válido para este servicio.');
        $data['booking_model'] = $model;
        $data['participants'] = $participants;
        $data['booking_capacity'] = $resource ? max(1, (int) $resource->capacity) : max(1, (int) $service->booking_capacity);
        $data['service_duration_minutes'] = BookingRules::duration($service, isset($data['duration_minutes']) ? (int) $data['duration_minutes'] : null, $professionalService?->duration_override);
        $data['duration_minutes'] = $data['service_duration_minutes'];
        $data['occupied_minutes'] = $data['service_duration_minutes'] + max(0, (int) $service->buffer_minutes);
        $data['price'] = BookingRules::totalPrice($service, $branchService?->price_override ?? $service->price, $data['duration_minutes'], $participants);
        $data['resource_name'] = $resource?->name;
        $data['slot_interval_minutes'] = max(1, (int) $service->slot_interval_minutes);
        $data['min_advance_minutes'] = $service->min_advance_minutes;
        $data['max_advance_days'] = $service->max_advance_days;
        $data['requires_confirmation'] = $service->requires_confirmation;

        $data['currency'] = 'COP';
        $data['professional_name'] = $professional?->name;
        if (! $lock) $this->prepared[$cacheKey] = array_intersect_key($data, array_flip(['service_duration_minutes', 'duration_minutes', 'occupied_minutes', 'price', 'currency', 'professional_name', 'resource_name', 'booking_model', 'participants', 'booking_capacity', 'slot_interval_minutes', 'min_advance_minutes', 'max_advance_days', 'requires_confirmation']));
        return $data;
    }

    public function reserve(array $data, ?int $ignoreId = null): array
    {
        $this->snapshot = null;
        $this->calendarDays = [];
        $this->operationalDays = $this->operationalSchedules = [];
        if (! empty($data['client_id'])) {
            $userId = Client::whereKey($data['client_id'])->value('user_id');
            if ($userId) User::whereKey($userId)->lockForUpdate()->first();
            $data['client_user_id'] = $userId;
        }
        // Lock the customer before the branch consistently across booking and rescheduling.
        BusinessBranch::whereKey($data['branch_id'])->lockForUpdate()->first();
        $this->windows = [];
        $this->prepared = [];
        $this->candidateIds = [];
        $resolved = $this->resolve($data, true, $ignoreId);
        unset($resolved['occupied_minutes'], $resolved['service_duration_minutes'], $resolved['professional_name'], $resolved['client_user_id'], $resolved['_retain_legacy_professional']);
        return $resolved;
    }

    public function resolve(array $data, bool $lock = false, ?int $ignoreId = null): array
    {
        foreach ($this->candidates($data) as $candidate) {
            $prepared = $this->prepare($candidate, $lock);
            $start = CarbonImmutable::parse($data['date'].' '.$data['start_time'], config('booking.timezone'));
            $end = $start->addMinutes($prepared['occupied_minutes']);
            $window = $this->scheduleWindow($prepared, $start);
            if (! $this->startAllowed($prepared, $start) || ! $start->isSameDay($end) || ! $window || $start->format('H:i:s') < $window[0] || $end->format('H:i:s') > $window[1]) continue;
            $prepared['start_time'] = $start->format('H:i:s');
            $prepared['end_time'] = $end->format('H:i:s');
            if (! $this->conflicts($prepared, $ignoreId)) return $prepared;
        }
        $this->invalid('start_time', 'Este horario no está disponible. Selecciona otro horario.');
    }

    public function slots(array $data, bool $firstOnly = false): array
    {
        $day = CarbonImmutable::parse($data['date'], config('booking.timezone'))->startOfDay();
        $clock = CarbonImmutable::now(config('booking.timezone'));
        if ($day->lt($clock->startOfDay())) return ['date' => $day->toDateString(), 'timezone' => config('booking.timezone'), 'slots' => [], 'professionals' => []];
        $slots = [];
        $professionals = [];
        $candidates = $this->candidates($data);
        $professionalIds = array_filter(array_column($candidates, 'professional_id'));
        $resourceIds = array_filter(array_column($candidates, 'resource_id'));
        $busy = $this->snapshot && empty($data['client_user_id']) ? $this->snapshot->appointments->get($data['date'], collect()) : Appointment::whereDate('date', $data['date'])->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->occupyingInventory()
            ->when(! empty($data['appointment_id']), fn ($q) => $q->where('id', '!=', $data['appointment_id']))
            ->where(function ($q) use ($data, $professionalIds, $resourceIds) {
                $q->whereIn('professional_id', $professionalIds)->orWhereIn('resource_id', $resourceIds);
                if (empty($data['professional_id']) && empty($data['resource_id'])) $q->orWhere(fn ($service) => $service->where('service_id', $data['service_id'])->where('branch_id', $data['branch_id']));
                if (! empty($data['client_user_id'])) $q->orWhereHas('client', fn ($client) => $client->where('user_id', $data['client_user_id']));
            })->with('client:id,user_id')->get(['id', 'client_id', 'professional_id', 'resource_id', 'start_time', 'end_time', 'service_id', 'branch_id', 'participants']);
        if ($this->snapshot && empty($data['client_user_id'])) $busy = $busy->filter(fn ($appointment) =>
            in_array($appointment->professional_id, $professionalIds) || in_array($appointment->resource_id, $resourceIds) || ((int) $appointment->service_id === (int) $data['service_id'] && (int) $appointment->branch_id === (int) $data['branch_id']));
        $busy = $busy->map(fn ($appointment) => ['professional_id' => $appointment->professional_id, 'resource_id' => $appointment->resource_id,
            'service_id' => $appointment->service_id, 'branch_id' => $appointment->branch_id, 'participants' => $appointment->participants,
            'start_time' => $appointment->getRawOriginal('start_time'), 'end_time' => $appointment->getRawOriginal('end_time'),
            'client_user_id' => empty($data['client_user_id']) ? null : $appointment->client?->user_id]);
        $resources = $this->snapshot?->resources ?? Resource::whereIn('id', $resourceIds)->get(['id', 'capacity'])->keyBy('id');
        $pricing = app(\App\Modules\Catalog\Services\DynamicPricingService::class);
        foreach ($candidates as $candidate) {
            $prepared = $this->prepare($candidate);
            $window = $this->scheduleWindow($prepared, $day);
            if (! $window) continue;
            if (! empty($prepared['professional_id'])) $professionals[$prepared['professional_id']] = ['id' => $prepared['professional_id'], 'name' => $prepared['professional_name']];
            $openingMinute = $this->minuteOfDay($window[0]);
            $closingMinute = min(1439, $this->minuteOfDay($window[1])) - $prepared['occupied_minutes'];
            $earliest = $clock->addMinutes($prepared['min_advance_minutes'] ?? 0);
            if ($day->lt($earliest->startOfDay()) || ($prepared['max_advance_days'] !== null && $day->gt($clock->addDays($prepared['max_advance_days'])->endOfDay()))) continue;
            if ($day->isSameDay($earliest)) $openingMinute = max($openingMinute, $earliest->hour * 60 + $earliest->minute + ($earliest->second > 0 ? 1 : 0));
            if ($day->isSameDay($clock)) $openingMinute = max($openingMinute, $clock->hour * 60 + $clock->minute + ($clock->second > 0 ? 1 : 0));
            if ($prepared['max_advance_days'] !== null && $day->isSameDay($clock->addDays($prepared['max_advance_days']))) $closingMinute = min($closingMinute, $clock->hour * 60 + $clock->minute);
            if (! empty($data['time_from'])) $openingMinute = max($openingMinute, $this->minuteOfDay($data['time_from']));
            if (! empty($data['time_to'])) $closingMinute = min($closingMinute, $this->minuteOfDay($data['time_to']));
            for ($minute = (int) (ceil($openingMinute / $prepared['slot_interval_minutes']) * $prepared['slot_interval_minutes']); $minute <= $closingMinute; $minute += $prepared['slot_interval_minutes']) {
                $time = sprintf('%02d:%02d:00', intdiv($minute, 60), $minute % 60);
                if ($firstOnly && $slots && $time >= substr(min(array_keys($slots)), 0, 8)) break;
                $endMinute = $minute + $prepared['occupied_minutes'];
                $endTime = sprintf('%02d:%02d:00', intdiv($endMinute, 60), $endMinute % 60);
                $operationBlocked = $this->operationalBlocked([...$prepared, 'date' => $data['date'], 'start_time' => $time, 'end_time' => $endTime]);
                $overlapping = $busy->filter(fn ($appointment) => $appointment['start_time'] < $endTime && $appointment['end_time'] > $time);
                $professionalBusy = ! empty($prepared['professional_id']) && $overlapping->contains('professional_id', $prepared['professional_id']);
                $capacityAppointments = ! empty($prepared['resource_id']) ? $overlapping->where('resource_id', $prepared['resource_id'])
                    : $overlapping->where('service_id', $data['service_id'])->where('branch_id', $data['branch_id']);
                $remaining = max(0, $prepared['booking_capacity'] - $this->peakUsage($capacityAppointments));
                if (empty($prepared['resource_id']) && in_array($prepared['booking_model'], ['professional','optional_professional'], true)) $remaining = $professionalBusy ? 0 : 1;
                $capacityBusy = (! empty($prepared['resource_id']) || in_array($prepared['booking_model'], ['resource', 'direct', 'capacity'], true)) && $remaining < $prepared['participants'];

                $clientBusy = ! empty($data['client_user_id']) && $overlapping->contains(fn ($appointment) => (int) $appointment['client_user_id'] === (int) $data['client_user_id']);
                $dynamicPrice = $pricing->evaluate([...$prepared, 'date' => $data['date'], 'start_time' => $time]);
                $slot = ['start_time' => $time, 'end_time' => $endTime, 'available' => ! $operationBlocked && ! $professionalBusy && ! $capacityBusy && ! $clientBusy,
                    'professional_id' => $prepared['professional_id'], 'professional_name' => $prepared['professional_name'], 'resource_id' => $prepared['resource_id'],
                    'price' => $dynamicPrice['price'], 'dynamic_pricing' => $dynamicPrice, 'duration_minutes' => $prepared['service_duration_minutes'],
                    'booking_model' => $prepared['booking_model'], 'participants' => $prepared['participants'], 'remaining_capacity' => $professionalBusy || $operationBlocked ? 0 : $remaining, 'resource_name' => $prepared['resource_name']];
                if ($firstOnly && ! $slot['available']) continue;
                $slotKey = $time.':'.($prepared['resource_id'] ?? 0);
                if (! isset($slots[$slotKey]) || (! $slots[$slotKey]['available'] && $slot['available'])) $slots[$slotKey] = $slot;
                if ($firstOnly) break;
            }
        }
        ksort($slots);
        if ($firstOnly) return ['date' => $day->toDateString(), 'timezone' => config('booking.timezone'), 'slots' => array_slice(array_values($slots), 0, 1), 'professionals' => []];
        $profiles = $this->snapshot ? $this->snapshot->professionals->only(array_keys($professionals))->map(fn ($profile) => $profile->only(['id', 'name', 'photo_url', 'specialty']))->values()->all()
            : Professional::whereIn('id', array_keys($professionals))->get(['id', 'name', 'photo_url', 'specialty'])->toArray();
        return ['date' => $day->toDateString(), 'timezone' => config('booking.timezone'), 'slots' => array_values($slots), 'professionals' => $profiles];
    }

    private function minuteOfDay(string $time): int
    {
        return (int) substr($time, 0, 2) * 60 + (int) substr($time, 3, 2);
    }

    private function candidates(array $data): array
    {
        $key = implode(':', [$data['business_id'], $data['branch_id'], $data['service_id'], $data['professional_id'] ?? 0, $data['resource_id'] ?? 0, $data['resource_type'] ?? '', $data['sport_type'] ?? '', $data['surface'] ?? '', isset($data['covered']) ? (int) $data['covered'] : '']);
        if (isset($this->candidateIds[$key])) return array_map(fn ($ids) => array_replace($data, $ids), $this->candidateIds[$key]);
        $service = $this->snapshot ? $this->snapshot->services->get($data['service_id']) : Service::whereKey($data['service_id'])->where('business_id', $data['business_id'])->where('is_active', true)->first();
        $branch = $this->snapshot ? $this->snapshot->branches->get($data['branch_id']) : BusinessBranch::whereKey($data['branch_id'])->where('business_id', $data['business_id'])->where('is_active', true)->whereNull('deleted_at')->first();
        $business = $this->snapshot ? $this->snapshot->businesses->get($data['business_id']) : $branch?->business;
        if (! $service || ! $branch || ! $business?->is_active || (int) $service->business_id !== (int) $business->id || (int) $branch->business_id !== (int) $business->id) $this->invalid('service_id', 'La sede o el servicio no están disponibles.');
        if (! empty($data['professional_id'])) $professionalIds = [(int) $data['professional_id']];
        elseif (! in_array(BookingRules::model($service, $business), ['professional', 'optional_professional'], true)) $professionalIds = [null];
        else {
            $profiles = $this->snapshot ? $this->snapshot->professionals->where('business_id', $business->id)
                : Professional::where('business_id', $business->id)->where('is_active', true)->orderBy('id')->get();
            $links = $this->snapshot ? $this->snapshot->professionalServices->get($service->id, collect())
                : DB::table('catalog.professional_services')->where('service_id', $service->id)->get();
            if ($links->isNotEmpty()) $profiles = $profiles->whereIn('id', $links->where('branch_id', $branch->id)->where('is_active', true)->pluck('professional_id'));
            $professionalIds = $profiles->pluck('id')->all();
        }
        if (! empty($data['resource_id'])) $resourceIds = [(int) $data['resource_id']];
        elseif (BookingRules::model($service, $business) === 'resource') {
            $links = $this->snapshot ? $this->snapshot->resourceServices->get($service->id, collect())
                : DB::table('catalog.resource_services')->where('service_id', $service->id)->get();
            $resourceIds = $this->snapshot ? $this->snapshot->resources->where('branch_id', $branch->id)->whereIn('id', $links->where('is_active', true)->pluck('resource_id'))->pluck('id')->all()
                : Resource::where('branch_id', $branch->id)->where('is_active', true)->whereIn('id', $links->where('is_active', true)->pluck('resource_id'))->orderBy('id')->pluck('id')->all();
        }
        else $resourceIds = [null];
        if (array_intersect(array_keys(array_filter($data, fn ($value) => $value !== null)), ['resource_type','sport_type','surface','covered'])) {
            $resources = $this->snapshot?->resources ?? Resource::whereIn('id', array_filter($resourceIds))->get()->keyBy('id');
            $resourceIds = array_values(array_filter($resourceIds, function ($id) use ($data, $resources) {
                $resource = $resources->get($id);
                if (! $resource) return false;
                if (! empty($data['resource_type']) && $resource->getRawOriginal('type') !== $data['resource_type']) return false;
                foreach (['sport_type','surface','covered'] as $key) if (isset($data[$key]) && ($resource->attributes[$key] ?? null) != $data[$key]) return false;
                return true;
            }));
        }
        $candidates = [];
        foreach ($professionalIds as $professionalId) foreach ($resourceIds as $resourceId) {
            $candidates[] = array_replace($data, ['professional_id' => $professionalId, 'resource_id' => $resourceId]);
        }
        $this->candidateIds[$key] = array_map(fn ($candidate) => array_intersect_key($candidate, array_flip(['professional_id', 'resource_id'])), $candidates);
        return $candidates;
    }

    private function scheduleWindow(array $data, CarbonImmutable $day): ?array
    {
        $key = $data['branch_id'].':'.($data['professional_id'] ?? 0).':'.$day->dayOfWeek;
        if (array_key_exists($key, $this->windows)) return $this->windows[$key];
        $days = [strtoupper($day->englishDayOfWeek), strtolower($day->englishDayOfWeek), (string) $day->dayOfWeek];
        $schedule = $this->snapshot ? $this->snapshot->branchSchedules->get($data['branch_id'], collect())->whereIn('day', $days)->first()
            : DB::table('business.branch_schedules')->where('branch_id', $data['branch_id'])->whereIn('day', $days)->first();
        if (! $schedule || $schedule->is_closed) return $this->windows[$key] = null;
        $window = [$schedule->open_time, $schedule->close_time];
        if (empty($data['professional_id'])) return $this->windows[$key] = $window;
        $schedules = $this->snapshot ? $this->snapshot->professionalSchedules->get($data['professional_id'], collect())
            : DB::table('people.professional_availability')->where('professional_id', $data['professional_id'])->get();
        $professionalSchedule = $schedules->where('branch_id', $data['branch_id'])->firstWhere('day_of_week', $day->dayOfWeek);
        if (! $professionalSchedule) return $this->windows[$key] = $schedules->isNotEmpty() ? null : $window;
        if (! $professionalSchedule->is_available) return $this->windows[$key] = null;
        return $this->windows[$key] = [max($window[0], $professionalSchedule->start_time), min($window[1], $professionalSchedule->end_time)];
    }

    private function conflicts(array &$data, ?int $ignoreId): bool
    {
        if ($this->operationalBlocked($data)) return true;
        $query = Appointment::whereDate('date', $data['date'])->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->occupyingInventory()
            ->where('start_time', '<', $data['end_time'])->where('end_time', '>', $data['start_time'])->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId));
        if (! empty($data['client_user_id']) && (clone $query)->whereHas('client', fn ($q) => $q->where('user_id', $data['client_user_id']))->exists()) return true;
        if (! empty($data['professional_id']) && (clone $query)->where('professional_id', $data['professional_id'])->exists()) return true;
        $data['remaining_capacity'] = 1;
        if (! empty($data['resource_id']) || in_array($data['booking_model'], ['resource', 'direct', 'capacity'], true)) {
            $capacityQuery = ! empty($data['resource_id']) ? (clone $query)->where('resource_id', $data['resource_id'])
                : (clone $query)->where('service_id', $data['service_id'])->where('branch_id', $data['branch_id']);
            $data['remaining_capacity'] = max(0, $data['booking_capacity'] - $this->peakUsage($capacityQuery->get(['start_time', 'end_time', 'participants'])));
            return $data['participants'] > $data['remaining_capacity'];
        }
        return false;
    }

    private function operationalBlocked(array $data): bool
    {
        $start = CarbonImmutable::parse($data['date'].' '.$data['start_time'], config('booking.timezone'));
        $end = CarbonImmutable::parse($data['date'].' '.$data['end_time'], config('booking.timezone'));
        $key = $data['business_id'].':'.$data['date'];
        $blocks = $this->snapshot?->operationalBlocks ?? ($this->operationalDays[$key] ??= \App\Modules\Booking\Models\OperationalBlock::where('business_id', $data['business_id'])
            ->where('starts_at', '<', $start->startOfDay()->addDay()->utc())->where('ends_at', '>', $start->startOfDay()->utc())->get());
        if ($blocks->contains(fn ($block) => (int) $block->business_id === (int) $data['business_id'] && $block->starts_at->lt($end) && $block->ends_at->gt($start)
            && (($block->branch_id && (int) $block->branch_id === (int) $data['branch_id'])
                || ($block->professional_id && (int) $block->professional_id === (int) ($data['professional_id'] ?? 0))
                || ($block->resource_id && (int) $block->resource_id === (int) ($data['resource_id'] ?? 0))))) return true;
        if (empty($data['professional_id'])) return false;
        $calendarKey = $data['professional_id'].':'.$data['date'];
        $calendar = $this->snapshot?->calendarBusy ?? ($this->calendarDays[$calendarKey] ??= DB::table('platform.google_calendar_busy')->where('professional_id', $data['professional_id'])
            ->where('starts_at', '<', $start->startOfDay()->addDay()->utc())->where('ends_at', '>', $start->startOfDay()->utc())->get());
        if ($calendar->contains(fn ($block) => (int) $block->professional_id === (int) $data['professional_id'] && CarbonImmutable::parse($block->starts_at)->lt($end) && CarbonImmutable::parse($block->ends_at)->gt($start))) return true;
        $schedules = $this->snapshot ? $this->snapshot->professionalSchedules->get($data['professional_id'], collect())
            : ($this->operationalSchedules[$data['professional_id']] ??= DB::table('people.professional_availability')->where('professional_id', $data['professional_id'])->get());
        $schedule = $schedules->where('branch_id', $data['branch_id'])->firstWhere('day_of_week', $start->dayOfWeek);
        return $schedule && $schedule->break_start_time && $schedule->break_end_time
            && $data['start_time'] < $schedule->break_end_time && $data['end_time'] > $schedule->break_start_time;
    }

    private function peakUsage(iterable $appointments): int
    {
        $events = [];
        foreach ($appointments as $appointment) {
            $start = is_array($appointment) ? $appointment['start_time'] : $appointment->start_time->format('H:i:s');
            $end = is_array($appointment) ? $appointment['end_time'] : $appointment->end_time->format('H:i:s');
            $units = is_array($appointment) ? ($appointment['participants'] ?? 1) : ($appointment->participants ?? 1);
            $events[$start] = ($events[$start] ?? 0) + $units; $events[$end] = ($events[$end] ?? 0) - $units;
        }
        ksort($events); $concurrent = 0; $peak = 0;
        foreach ($events as $change) { $concurrent += $change; $peak = max($peak, $concurrent); }
        return $peak;
    }

    private function startAllowed(array $data, CarbonImmutable $start): bool
    {
        $clock = CarbonImmutable::now(config('booking.timezone'));
        return $start->gte($clock->addMinutes($data['min_advance_minutes'] ?? 0))
            && ($data['max_advance_days'] === null || $start->lte($clock->addDays($data['max_advance_days'])))
            && $this->minuteOfDay($start->format('H:i')) % $data['slot_interval_minutes'] === 0;
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
