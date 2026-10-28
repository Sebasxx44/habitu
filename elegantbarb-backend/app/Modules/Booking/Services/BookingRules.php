<?php

declare(strict_types=1);

namespace App\Modules\Booking\Services;

use App\Core\Support\Money;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

final class BookingRules
{
    public static function model(Service $service, ?Business $business = null): string
    {
        if ($service->booking_model) return $service->booking_model;
        $business ??= $service->business;
        if ($business?->uses_resources && ! $business?->uses_professionals) return 'resource';
        if ($service->requires_professional) return 'professional';
        if ($business?->uses_resources) return 'resource';
        return $service->max_participants > 1 ? 'capacity' : 'direct';
    }

    public static function duration(Service $service, ?int $requested, ?int $professionalOverride = null): int
    {
        $fixed = $professionalOverride ?? $service->duration_minutes;
        $duration = $requested ?? $fixed;
        $options = $service->duration_mode === 'selectable' ? ($service->duration_options ?? []) : [$fixed];
        if (! in_array($duration, $options, true)) throw ValidationException::withMessages(['duration_minutes' => 'Selecciona una duración habilitada para este servicio.']);
        return $duration;
    }

    public static function totalPrice(Service $service, string|int|float $basePrice, int $duration, int $participants): string
    {
        $minor = Money::minor($basePrice);
        if ($service->duration_mode === 'selectable') $minor = intdiv($minor * $duration + intdiv($service->duration_minutes, 2), $service->duration_minutes);
        if (self::model($service) === 'capacity') $minor *= $participants;
        return Money::decimal($minor);
    }

    public static function allowsStart(Service $service, CarbonImmutable $start): bool
    {
        $clock = CarbonImmutable::now(config('booking.timezone'));
        return $start->gte($clock->addMinutes($service->min_advance_minutes ?? 0))
            && ($service->max_advance_days === null || $start->lte($clock->addDays($service->max_advance_days)));
    }

    public static function retainsLegacyProfessional(Appointment $appointment): bool
    {
        return $appointment->professional_id !== null
            && $appointment->booking_model !== 'resource'
            && $appointment->service
            && self::model($appointment->service) === 'resource'
            && ! $appointment->service->resource_professional_optional;
    }

    public static function allowsAction(Appointment $appointment, string $action): bool
    {
        $service = $appointment->service;
        if (! $service) return false;
        if ($appointment->hold_expires_at) return $action === 'cancel';
        $snapshot = $appointment->checkout_snapshot ?? [];
        $allowed = $action === 'cancel' ? ($snapshot['allow_cancellation'] ?? $service->allow_cancellation) : ($snapshot['allow_reschedule'] ?? $service->allow_reschedule);
        $notice = $action === 'cancel' ? ($snapshot['cancellation_notice_minutes'] ?? $service->cancellation_notice_minutes) : ($snapshot['reschedule_notice_minutes'] ?? $service->reschedule_notice_minutes);
        $start = CarbonImmutable::parse($appointment->date->toDateString().' '.$appointment->start_time->format('H:i:s'), config('booking.timezone'));
        return $allowed && $start->gte(CarbonImmutable::now(config('booking.timezone'))->addMinutes($notice ?? 0));
    }
}
