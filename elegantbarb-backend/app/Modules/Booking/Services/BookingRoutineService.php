<?php

namespace App\Modules\Booking\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\BookingRoutine;
use App\Modules\Booking\Models\RoutineOccurrence;
use App\Services\BusinessAccessService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class BookingRoutineService
{
    public function create(User $user, array $data): BookingRoutine
    {
        $source = $this->ownedAppointment($user, $data['appointment_id']);
        abort_unless(app(\App\Services\FeatureFlagService::class)->isEnabled('routines', $user->id, $source->business_id, $source->business?->business_category_id), 403, 'Las rutinas están desactivadas para este negocio.');
        $start = CarbonImmutable::parse($data['start_date'].' '.$data['start_time'], config('booking.timezone'));
        $this->assertHorizon($start, $data['interval_weeks'], $data['count']);
        return DB::transaction(fn () => $this->createPlan($user, $source, $data, $start));
    }

    private function createPlan(User $user, Appointment $source, array $data, CarbonImmutable $start): BookingRoutine
    {
        $routine = BookingRoutine::create(['user_id' => $user->id, 'source_appointment_id' => $source->id, 'name' => $data['name'], 'interval_weeks' => $data['interval_weeks'],
            'template' => array_replace($source->only(['business_id', 'branch_id', 'service_id', 'professional_id', 'resource_id']), ['duration_minutes' => $source->duration_minutes ?: $source->service?->duration_minutes, 'participants' => $source->participants ?: 1])]);
        for ($index = 0; $index < $data['count']; $index++) $routine->occurrences()->create(['position' => $index + 1,
            'date' => $start->addWeeks($index * $data['interval_weeks'])->toDateString(), 'start_time' => $data['start_time']]);
        return $routine->load('occurrences');
    }

    public function update(User $user, int $id, array $data): BookingRoutine
    {
        return DB::transaction(fn () => $this->updateLocked($user, $id, $data));
    }

    private function updateLocked(User $user, int $id, array $data): BookingRoutine
    {
        $routine = BookingRoutine::where('user_id', $user->id)->lockForUpdate()->findOrFail($id);
        if (isset($data['start_date'])) {
            $current = CarbonImmutable::now(config('booking.timezone'));
            $pending = $routine->occurrences()->where('status', 'PLANNED')->where(fn ($query) => $query->whereDate('date', '>', $current->toDateString())
                ->orWhere(fn ($sameDay) => $sameDay->whereDate('date', $current->toDateString())->where('start_time', '>', $current->format('H:i:s'))))->lockForUpdate()->get();
            $start = CarbonImmutable::parse($data['start_date'].' '.$data['start_time'], config('booking.timezone'));
            $interval = $data['interval_weeks'] ?? $routine->interval_weeks;
            $this->assertHorizon($start, $interval, $pending->count());
            foreach ($pending as $index => $occurrence) $occurrence->update(['date' => $start->addWeeks($index * $interval)->toDateString(), 'start_time' => $data['start_time']]);
        }
        $routine->update(array_intersect_key($data, array_flip(['name', 'status', 'interval_weeks'])));
        return $routine->load('occurrences');
    }

    public function preview(User $user, int $id): array
    {
        $routine = BookingRoutine::where('user_id', $user->id)->with('occurrences')->findOrFail($id);
        $businessId = (int) $routine->template['business_id'];
        $categoryId = \App\Modules\Business\Models\Business::whereKey($businessId)->value('business_category_id');
        abort_unless(app(\App\Services\FeatureFlagService::class)->isEnabled('routines', $user->id, $businessId, $categoryId), 403, 'Las rutinas están desactivadas para este negocio.');
        $clientId = app(BusinessAccessService::class)->clientId($user);
        $availability = app(AvailabilityService::class);
        return ['routine_id' => $routine->id, 'checked_at' => now()->toIso8601String(), 'expires_at' => now()->addMinutes(2)->toIso8601String(), 'timezone' => config('booking.timezone'),
            'occurrences' => $routine->occurrences->map(fn (RoutineOccurrence $occurrence) => $this->previewOccurrence($user, $routine, $occurrence, $availability, $clientId))->all()];
    }

    private function previewOccurrence(User $user, BookingRoutine $routine, RoutineOccurrence $occurrence, AvailabilityService $availability, ?int $clientId): array
    {
        $result = ['id' => $occurrence->id, 'date' => $occurrence->date->toDateString(), 'start_time' => $occurrence->start_time, 'status' => $occurrence->status,
            'available' => false, 'quote' => null, 'booking_url' => null, 'appointment_id' => $occurrence->appointment_id];
        if ($routine->status !== 'ACTIVE' || $occurrence->status !== 'PLANNED') return $result;
        try {
            $reservation = $availability->resolve(array_filter($routine->template, fn ($value) => $value !== null) + ['date' => $occurrence->date->toDateString(), 'start_time' => $occurrence->start_time, 'client_user_id' => $user->id]);
            $quote = app(AppointmentPricingService::class)->quote($reservation, $clientId);
            $params = array_filter(['book' => 1, 'routine_occurrence_id' => $occurrence->id, 'date' => $occurrence->date->toDateString(), 'time' => substr($occurrence->start_time, 0, 5),
                'branch_id' => $reservation['branch_id'], 'service_id' => $reservation['service_id'], 'professional_id' => $reservation['professional_id'] ?? null,
                'resource_id' => $reservation['resource_id'] ?? null, 'duration_minutes' => $reservation['duration_minutes'], 'participants' => $reservation['participants']]);
            return array_replace($result, ['available' => true, 'quote' => $quote, 'booking_url' => '/cliente/business/'.$reservation['business_id'].'?'.http_build_query($params)]);
        } catch (ValidationException) { return $result; }
    }

    public function skip(User $user, int $id): RoutineOccurrence
    {
        return DB::transaction(fn () => $this->skipLocked($user, $id));
    }

    private function skipLocked(User $user, int $id): RoutineOccurrence
    {
        $occurrence = RoutineOccurrence::whereHas('routine', fn ($query) => $query->where('user_id', $user->id))->lockForUpdate()->findOrFail($id);
        abort_unless($occurrence->status === 'PLANNED' && CarbonImmutable::parse($occurrence->date->toDateString().' '.$occurrence->start_time, config('booking.timezone'))->isFuture(), 409, 'Esta fecha ya tiene una reserva o pertenece al historial.');
        $occurrence->update(['status' => 'SKIPPED']);
        return $occurrence;
    }

    public function attach(User $user, int $id, int $appointmentId): RoutineOccurrence
    {
        return DB::transaction(fn () => $this->attachLocked($user, $id, $appointmentId));
    }

    private function attachLocked(User $user, int $id, int $appointmentId): RoutineOccurrence
    {
        $occurrence = RoutineOccurrence::whereHas('routine', fn ($query) => $query->where('user_id', $user->id))->lockForUpdate()->findOrFail($id);
        if ($occurrence->appointment_id === $appointmentId) return $occurrence;
        abort_unless($occurrence->status === 'PLANNED', 409, 'La ocurrencia ya fue resuelta.');
        $appointment = $this->ownedAppointment($user, $appointmentId, true);
        abort_if(in_array($appointment->status->value, ['CANCELLED', 'NO_SHOW'], true), 422);
        foreach ($occurrence->routine->template as $key => $value) abort_unless((int) $appointment->getAttribute($key) === (int) $value, 422, 'La reserva no coincide con esta rutina.');
        abort_unless($appointment->date->toDateString() === $occurrence->date->toDateString() && substr($appointment->getRawOriginal('start_time'), 0, 5) === substr($occurrence->start_time, 0, 5), 422, 'La reserva debe coincidir con la fecha y hora de la ocurrencia.');
        abort_if(RoutineOccurrence::where('appointment_id', $appointmentId)->exists(), 409, 'La reserva ya está vinculada a una ocurrencia.');
        $occurrence->update(['status' => 'BOOKED', 'appointment_id' => $appointmentId, 'accepted_conditions' => $appointment->only(['price', 'discount_amount', 'final_price', 'currency', 'duration_minutes', 'participants', 'booking_model', 'payment_status', 'checkout_snapshot'])]);
        return $occurrence;
    }

    private function ownedAppointment(User $user, int $id, bool $lock = false): Appointment
    {
        return Appointment::whereHas('client', fn ($query) => $query->where('user_id', $user->id))->when($lock, fn ($query) => $query->lockForUpdate())->findOrFail($id);
    }

    private function assertHorizon(CarbonImmutable $start, int $weeks, int $count): void
    {
        $today = CarbonImmutable::now(config('booking.timezone'))->startOfDay();
        if ($start->lt(CarbonImmutable::now(config('booking.timezone'))) || $start->addWeeks(max(0, $count - 1) * $weeks)->gt($today->addYear())) {
            throw ValidationException::withMessages(['start_date' => 'Las fechas deben estar dentro del próximo año.']);
        }
    }
}
