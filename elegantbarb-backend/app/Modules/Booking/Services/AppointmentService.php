<?php

namespace App\Modules\Booking\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Core\Enums\AppointmentStatus;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Repositories\AppointmentRepository;
use App\Modules\Platform\Services\WhatsAppService;
use App\Modules\Platform\Services\GoogleCalendarService;

class AppointmentService implements ServiceInterface
{
    public function __construct(
        private AppointmentRepository $repository
    ) {}

    public function all(array $filters = [], ?\App\Models\User $viewer = null): ServiceResponse
    {
        $query = Appointment::with(['client', 'professional', 'service', 'business', 'branch'])
            ->select('booking.appointments.*')
            ->selectSub(DB::table('reviews.reviews')->select('id')->whereColumn('appointment_id', 'booking.appointments.id')->limit(1), 'review_id');
        foreach (['business_id', 'client_id', 'professional_id', 'branch_id', 'date', 'status'] as $filter) {
            if (isset($filters[$filter]) && $filters[$filter] !== '') {
                $query->where($filter, $filters[$filter]);
            }
        }
        if (! empty($filters['search'])) {
            $search = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $filters['search']) . '%';
            $query->where(fn ($q) => $q->where('booking_code', 'ilike', $search)
                ->orWhereHas('client', fn ($q) => $q->where('name', 'ilike', $search))
                ->orWhereHas('professional', fn ($q) => $q->where('name', 'ilike', $search))
                ->orWhereHas('service', fn ($q) => $q->where('name', 'ilike', $search)));
        }
        if (! empty($filters['client_user_id'])) $query->whereHas('client', fn ($q) => $q->where('user_id', $filters['client_user_id']));
        $view = $filters['view'] ?? null;
        $clock = now(config('booking.timezone'));
        if ($view === 'upcoming') {
            $query->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])
                ->where(fn ($q) => $q->where('date', '>', $clock->toDateString())
                    ->orWhere(fn ($q) => $q->where('date', $clock->toDateString())->where('end_time', '>', $clock->format('H:i:s'))));
        } elseif ($view === 'completed') {
            $query->where('status', 'COMPLETED');
        } elseif ($view === 'cancelled') {
            $query->whereIn('status', ['CANCELLED', 'NO_SHOW']);
        }
        if (! empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }
        $direction = $view === 'upcoming' ? 'asc' : 'desc';
        $query->orderBy('date', $direction)->orderBy('start_time', $direction)->orderBy('id', $direction);
        $appointments = isset($filters['per_page']) || isset($filters['page'])
            ? $query->paginate(min(100, max(1, (int) ($filters['per_page'] ?? 12))))
            : $query->get();
        if ($viewer) {
            $present = fn ($appointment) => app(AppointmentPresentationService::class)->present($appointment, $viewer);
            $appointments = $appointments instanceof \Illuminate\Pagination\LengthAwarePaginator
                ? $appointments->through($present) : $appointments->map($present);
        }
        return ServiceResponse::success($appointments, 'Citas obtenidas');
    }


    public function find(int $id, ?\App\Models\User $viewer = null): ServiceResponse
    {
        $appointment = $this->repository->with([
            'client',
            'professional',
            'service',
            'business',
            'branch',
            'resource',
        ])->find($id);

        if (! $appointment) {
            return ServiceResponse::notFound('Cita');
        }

        $appointment->setAttribute('review_id', DB::table('reviews.reviews')->where('appointment_id', $id)->value('id'));
        return ServiceResponse::success($viewer ? app(AppointmentPresentationService::class)->present($appointment, $viewer, true) : $appointment, 'Cita encontrada');
    }

    public function create(array $data): ServiceResponse
    {
        $appointment = DB::transaction(fn () => $this->createReservation($data));

        // Replay of an idempotent request does not resend provider messages.
        if ($appointment->wasRecentlyCreated && ! $appointment->hold_expires_at && empty($data['_suppress_dispatch'])) try {
            $loadedAppointment = $appointment->load(['client', 'professional', 'service', 'business', 'branch']);
            app(WhatsAppService::class)->sendBookingConfirmation($loadedAppointment);
            app(GoogleCalendarService::class)->pushAppointmentToCalendar($loadedAppointment);
        } catch (\Throwable $e) {
            \Log::warning('Notification dispatch error: ' . $e->getMessage());
        }

        return ServiceResponse::success($appointment->load(['client', 'professional', 'service', 'business', 'branch']), 'Cita creada exitosamente', $appointment->wasRecentlyCreated ? 201 : 200);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $appointment = DB::transaction(fn () => $this->applyUpdate($id, $data));
        return $appointment ? ServiceResponse::success($appointment, 'Cita actualizada') : ServiceResponse::notFound('Cita');
    }


    public function delete(int $id): ServiceResponse
    {
        $appointment = $this->repository->find($id);
        if (! $appointment) {
            return ServiceResponse::notFound('Cita');
        }

        $this->repository->delete($id);
        return ServiceResponse::success(null, 'Cita eliminada');
    }

    public function cancel(int $id, ?string $reason = null, ?int $cancelledById = null): ServiceResponse
    {
        $appointment = DB::transaction(fn () => $this->applyUpdate($id, ['status' => AppointmentStatus::CANCELLED->value], $reason, $cancelledById));
        if (! $appointment) {
            return ServiceResponse::notFound('Cita');
        }

        // Notify client via WhatsApp and delete calendar event
        try {
            $appt = $this->repository->with(['client', 'professional', 'service'])->find($id);
            if ($appt) {
                app(WhatsAppService::class)->sendCancellationNotification($appt);
                app(GoogleCalendarService::class)->deleteCalendarEvent($appt);
            }
        } catch (\Throwable $e) {
            \Log::warning('Cancel notification error: ' . $e->getMessage());
        }

        return ServiceResponse::success(null, 'Cita cancelada exitosamente');
    }

    public function reschedule(int $id, array $data, ?int $userId = null): ServiceResponse
    {
        $appointment = DB::transaction(fn () => $this->moveReservation($id, $data, $userId));
        if (! $appointment) {
            return ServiceResponse::notFound('Cita');
        }
        return ServiceResponse::success($appointment->load(['client', 'professional', 'service', 'business', 'branch']), 'Cita reagendada');
    }


    public function complete(int $id): ServiceResponse
    {
        $appointment = DB::transaction(fn () => $this->applyUpdate($id, ['status' => AppointmentStatus::COMPLETED->value]));
        if (! $appointment) {
            return ServiceResponse::notFound('Cita');
        }

        // Send post-service satisfaction survey via WhatsApp
        try {
            $appt = $this->repository->with(['client', 'professional'])->find($id);
            if ($appt) {
                app(WhatsAppService::class)->sendPostServiceSurvey($appt);
            }
        } catch (\Throwable $e) {
            \Log::warning('Post-service notification error: ' . $e->getMessage());
        }

        return ServiceResponse::success(null, 'Cita completada');
    }

    public function getStats(int $businessId): ServiceResponse
    {
        $stats = [
            'total_today' => Appointment::where('business_id', $businessId)->whereDate('date', now(config('booking.timezone'))->toDateString())->count(),
            'completed_today' => Appointment::where('business_id', $businessId)
                ->where('status', AppointmentStatus::COMPLETED)
                ->whereDate('date', now(config('booking.timezone'))->toDateString())
                ->count(),
            'pending' => $this->repository->countByStatus($businessId, AppointmentStatus::PENDING->value),
            'cancelled' => $this->repository->countByStatus($businessId, AppointmentStatus::CANCELLED->value),
        ];

        return ServiceResponse::success($stats, 'Estadísticas de citas');
    }
    private function createReservation(array $data): Appointment
    {
        app(\App\Modules\Business\Services\BusinessService::class)->assertBookable((int) $data['business_id']);
        if (! empty($data['client_user_id'])) {
            $user = \App\Models\User::whereKey($data['client_user_id'])->lockForUpdate()->firstOrFail();
            $profile = \App\Modules\People\Models\Client::firstOrCreate(['user_id' => $user->id, 'business_id' => $data['business_id']], [
                'name' => $user->name, 'email' => $user->email,
            ]);
            $data['client_id'] = $profile->id;
        }
        if (! empty($data['idempotency_key'])) {
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['booking:'.$data['idempotency_key']]);
            $existing = Appointment::where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                if ((int) $existing->client_id !== (int) $data['client_id'] || (int) $existing->service_id !== (int) $data['service_id']
                    || (int) $existing->branch_id !== (int) $data['branch_id'] || $existing->date->format('Y-m-d') !== $data['date']
                    || $existing->start_time->format('H:i') !== substr($data['start_time'], 0, 5)
                    || (isset($data['duration_minutes']) && (int) $existing->duration_minutes !== (int) $data['duration_minutes'])
                    || (int) $existing->participants !== (int) ($data['participants'] ?? 1)) {
                    throw ValidationException::withMessages(['idempotency_key' => 'Esta confirmación ya fue utilizada para otra reserva.']);
                }
                return $existing;
            }
        }
        $policy = \App\Modules\Finance\Models\BookingPaymentPolicy::find($data['business_id']);
        if ($policy && empty($data['_checkout_authorized']) && ! in_array('ON_SITE', $policy->allowed_modes, true)) {
            throw ValidationException::withMessages(['payment_mode' => 'Este negocio requiere confirmar la reserva mediante el checkout.']);
        }
        $prepared = app(AvailabilityService::class)->reserve($data);
        $quote = app(AppointmentPricingService::class)->quote($prepared, (int) $prepared['client_id'], true);
        if (isset($data['expected_total']) && \App\Core\Support\Money::minor($data['expected_total']) !== \App\Core\Support\Money::minor($quote['total'])) {
            throw ValidationException::withMessages(['expected_total' => 'El total cambió. Revisa el precio actualizado y confirma nuevamente.']);
        }
        $prepared['booking_code'] = 'EB-'.now()->format('Y').'-'.strtoupper(\Illuminate\Support\Str::random(8));
        $prepared['dynamic_pricing'] = $quote['dynamic_pricing'] ?? null;
        $prepared['price'] = $quote['subtotal'];
        $prepared['discount_amount'] = $quote['discount'];
        $prepared['final_price'] = $quote['total'];
        $prepared['status'] = ($prepared['requires_confirmation'] ?? true) ? AppointmentStatus::PENDING : AppointmentStatus::CONFIRMED;
        if (! empty($data['_checkout_hold_until'])) {
            $prepared['hold_expires_at'] = $data['_checkout_hold_until'];
            $prepared['status'] = AppointmentStatus::PENDING;
        }
        $prepared['payment_status'] = 'PENDING';
        $appointment = $this->repository->create($prepared);
        app(AppointmentPricingService::class)->redeem($quote, $appointment->id, $appointment->client_id);
        $this->recordEvent($appointment->id, 'created');
        app(\App\Modules\Marketing\Services\AdMeasurementService::class)->attribute($appointment);
        app(\App\Modules\Marketing\Services\RetentionAttributionService::class)->attribute($appointment);
        return $appointment;
    }

    private function applyUpdate(int $id, array $data, ?string $reason = null, ?int $userId = null): ?Appointment
    {
        $appointment = Appointment::whereKey($id)->lockForUpdate()->first();
        if (! $appointment) {
            return null;
        }
        $target = isset($data['status']) ? AppointmentStatus::from($data['status']) : $appointment->status;
        if ($appointment->hold_expires_at && ! in_array($target, [AppointmentStatus::PENDING, AppointmentStatus::CANCELLED], true)) {
            throw ValidationException::withMessages(['status' => 'El pago debe verificarse antes de confirmar o completar la reserva.']);
        }
        $allowed = match ($appointment->status) {
            AppointmentStatus::PENDING => [AppointmentStatus::CONFIRMED, AppointmentStatus::CANCELLED, AppointmentStatus::NO_SHOW, AppointmentStatus::COMPLETED],
            AppointmentStatus::CONFIRMED, AppointmentStatus::RESCHEDULED => [AppointmentStatus::COMPLETED, AppointmentStatus::CANCELLED, AppointmentStatus::NO_SHOW],
            default => [],
        };
        if ($target !== $appointment->status && ! in_array($target, $allowed, true)) {
            throw ValidationException::withMessages(['status' => 'Esta transición de estado no está permitida.']);
        }
        if ($target !== $appointment->status && $target === AppointmentStatus::CANCELLED) {
            if ($userId && \App\Models\User::whereKey($userId)->value('role') === 'CLIENTE' && ! BookingRules::allowsAction($appointment, 'cancel')) throw ValidationException::withMessages(['status' => 'Esta reserva no permite cancelación en este momento.']);
            $data['cancelled_at'] = now();
            DB::table('booking.appointment_cancellations')->insert([
                'appointment_id' => $id, 'reason' => $reason,
                'cancelled_by_type' => $userId ? 'USER' : 'SYSTEM', 'cancelled_by_id' => $userId,
                'created_at' => now(),
            ]);
        }
        if ($target === AppointmentStatus::COMPLETED && $appointment->status !== $target) {
            app(\App\Modules\Subscriptions\Services\MembershipService::class)->validateFulfillment($id);
            $data['completed_at'] = now();
        }
        $previous = $appointment->status;
        $appointment->update($data);
        if ($target !== $previous && $target === AppointmentStatus::COMPLETED) app(\App\Modules\Benefits\Services\LoyaltyBenefitService::class)->awardCompleted($appointment);
        if ($target !== $previous && $target === AppointmentStatus::CANCELLED) app(\App\Modules\Subscriptions\Services\MembershipService::class)->restoreCancelled($id);
        if ($target !== $previous && $target === AppointmentStatus::CANCELLED && $appointment->hold_expires_at) app(AppointmentPricingService::class)->releaseUnpaidHold($id);
        if ($target !== $previous) $this->recordEvent($id, strtolower($target->value), $reason);
        elseif ($appointment->wasChanged('notes')) $this->recordEvent($id, 'updated');
        if ($target !== $previous && in_array($target, [AppointmentStatus::CANCELLED, AppointmentStatus::NO_SHOW], true)) app(WaitlistService::class)->notifyAvailableSlots($appointment->business_id, $appointment->service_id, $appointment->date->toDateString());
        return $appointment;
    }

    private function moveReservation(int $id, array $data, ?int $userId): ?Appointment
    {
        $appointment = Appointment::whereKey($id)->lockForUpdate()->first();
        if (! $appointment) {
            return null;
        }
        if ($appointment->hold_expires_at) throw ValidationException::withMessages(['date' => 'Finaliza el pago o cancela el bloqueo antes de reprogramar.']);
        if (! in_array($appointment->status, [AppointmentStatus::PENDING, AppointmentStatus::CONFIRMED, AppointmentStatus::RESCHEDULED], true)) {
            throw ValidationException::withMessages(['status' => 'Solo puedes reprogramar citas activas.']);
        }
        if ($userId && \App\Models\User::whereKey($userId)->value('role') === 'CLIENTE' && ! BookingRules::allowsAction($appointment, 'reschedule')) throw ValidationException::withMessages(['date' => 'Esta reserva no permite reprogramación en este momento.']);
        $currentDuration = $appointment->duration_minutes ?? $appointment->service->duration_minutes;
        if ((isset($data['duration_minutes']) && (int) $data['duration_minutes'] !== (int) $currentDuration) || (isset($data['participants']) && (int) $data['participants'] !== (int) $appointment->participants)) throw ValidationException::withMessages(['duration_minutes' => 'La reprogramación conserva la duración y los cupos. Para cambiarlos crea una nueva reserva.']);
        $data['duration_minutes'] = $currentDuration;
        if (BookingRules::retainsLegacyProfessional($appointment)) {
            if (array_key_exists('professional_id', $data) && (int) $data['professional_id'] !== (int) $appointment->professional_id) throw ValidationException::withMessages(['professional_id' => 'Esta reserva conserva su asignación histórica.']);
            $data['_retain_legacy_professional'] = true;
        }
        $promotion = DB::table('marketing.promotion_redemptions as r')->join('marketing.promotions as p', 'p.id', '=', 'r.promotion_id')
            ->where('r.appointment_id', $id)->select('p.start_date', 'p.end_date')->first();
        if ($promotion && ($data['date'] < substr($promotion->start_date, 0, 10) || $data['date'] > substr($promotion->end_date, 0, 10))) {
            throw ValidationException::withMessages(['date' => 'La nueva fecha está fuera de la vigencia de la promoción aplicada.']);
        }
        app(\App\Modules\Subscriptions\Services\MembershipService::class)->validateReschedule($id, $data['date'], $data['start_time']);
        $reservation = app(AvailabilityService::class)->reserve(array_merge($appointment->getAttributes(), $data), $id);
        DB::table('booking.appointment_reschedules')->insert([
            'appointment_id' => $id,
            'old_date' => $appointment->date->format('Y-m-d'),
            'old_start_time' => $appointment->start_time->format('H:i:s'),
            'old_professional_id' => $appointment->professional_id,
            'new_date' => $data['date'],
            'new_start_time' => $reservation['start_time'],
            'new_professional_id' => $reservation['professional_id'],
            'reason' => $data['reason'] ?? null,
            'rescheduled_by_type' => $userId ? 'USER' : 'SYSTEM',
            'rescheduled_by_id' => $userId,
            'created_at' => now(),
        ]);
        $oldDate = $appointment->date->toDateString();
        $appointment->update([
            'date' => $data['date'], 'start_time' => $reservation['start_time'], 'end_time' => $reservation['end_time'],
            'duration_minutes' => $reservation['duration_minutes'], 'professional_id' => $reservation['professional_id'], 'resource_id' => $reservation['resource_id'] ?? null, 'status' => AppointmentStatus::CONFIRMED,
        ]);
        $this->recordEvent($id, 'rescheduled', $data['reason'] ?? null);
        app(WaitlistService::class)->notifyAvailableSlots($appointment->business_id, $appointment->service_id, $oldDate);
        return $appointment;
    }

    private function recordEvent(int $id, string $type, ?string $description = null): void
    {
        $eventId = DB::table('booking.appointment_events')->insertGetId(['appointment_id' => $id, 'type' => $type, 'description' => $description, 'created_at' => now()]);
        app(AppointmentNotificationService::class)->record($eventId);
        app(\App\Modules\Platform\Services\MarketplaceOutbox::class)->booking($eventId);
    }
}
