<?php

declare(strict_types=1);

namespace App\Modules\Benefits\Services;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Benefits\Models\PackageProposal;
use App\Modules\Benefits\Models\ServicePackage;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentPricingService;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Catalog\Models\Service;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Finance\Services\ReservationCheckoutService;
use App\Modules\People\Models\Client;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ServicePackageService
{
    public function preview(User $user, ServicePackage $package, array $data): PackageProposal
    {
        abort_unless($package->is_active, 422, 'El paquete no está disponible.');
        $policy = BookingPaymentPolicy::find($package->business_id);
        abort_unless(! $policy || in_array('ON_SITE', $policy->allowed_modes, true), 422, 'Este negocio requiere pago en línea. Reserva cada servicio mediante su checkout individual.');
        $start = CarbonImmutable::parse($data['date'].' '.$data['start_time'], config('booking.timezone'));
        $clientId = Client::where('user_id', $user->id)->value('id');
        $items = [];
        $total = 0;
        foreach ($package->service_ids as $serviceId) {
            abort_unless($start->toDateString() === $data['date'], 422, 'El paquete no puede cruzar el cierre del día.');
            $service = Service::where('business_id', $package->business_id)->where('is_active', true)->findOrFail($serviceId);
            $request = ['business_id' => $package->business_id, 'branch_id' => $data['branch_id'], 'service_id' => $serviceId,
                'date' => $data['date'], 'start_time' => $start->format('H:i'), 'client_user_id' => $user->id, 'participants' => 1];
            $resolved = app(AvailabilityService::class)->resolve($request);
            $quote = app(AppointmentPricingService::class)->quote($resolved, $clientId);
            $request += ['professional_id' => $resolved['professional_id'], 'resource_id' => $resolved['resource_id'] ?? null, 'duration_minutes' => $resolved['duration_minutes']];
            unset($request['client_user_id']);
            $items[] = ['service_name' => $service->name, 'request' => $request, 'quote' => $quote, 'end_time' => $resolved['end_time'], 'terms' => $this->terms($service)];
            $total += Money::minor($quote['total']);
            $start = CarbonImmutable::parse($data['date'].' '.$resolved['end_time'], config('booking.timezone'));
        }
        return PackageProposal::create(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'package_id' => $package->id,
            'expires_at' => now()->addMinutes(10), 'status' => 'PREVIEW', 'snapshot' => ['package_name' => $package->name,
                'business_id' => $package->business_id, 'date' => $data['date'], 'items' => $items, 'total' => Money::decimal($total), 'currency' => 'COP',
                'payment_mode' => 'ON_SITE', 'policy_version' => $policy?->version, 'cancellation_terms' => $policy?->cancellation_terms,
                'inventory_reserved' => false, 'execution' => 'CONSECUTIVE']]);
    }

    public function confirm(User $user, string $proposalId, string $key): PackageProposal
    {
        return DB::transaction(function () use ($user, $proposalId, $key) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $proposal = PackageProposal::where('user_id', $user->id)->whereKey($proposalId)->lockForUpdate()->firstOrFail();
            if ($proposal->status === 'CONFIRMED') { abort_unless($proposal->idempotency_key === $key, 409, 'Esta propuesta ya fue confirmada.'); return $proposal; }
            abort_unless($proposal->expires_at->isFuture(), 422, 'La propuesta venció. Consulta nuevamente horarios y precios.');
            abort_if(PackageProposal::where('user_id', $user->id)->where('idempotency_key', $key)->exists(), 409, 'La referencia ya pertenece a otro paquete.');
            $package = ServicePackage::whereKey($proposal->package_id)->where('is_active', true)->firstOrFail();
            abort_unless($package->service_ids === array_column(array_column($proposal->snapshot['items'], 'request'), 'service_id'), 422, 'El paquete cambió. Consulta nuevamente su composición.');
            $policy = BookingPaymentPolicy::find($package->business_id);
            abort_unless(($policy?->version) === $proposal->snapshot['policy_version'] && (! $policy || in_array('ON_SITE', $policy->allowed_modes, true)), 422, 'Las condiciones de pago cambiaron. Revisa el paquete antes de confirmar.');
            $ids = [];
            foreach ($proposal->snapshot['items'] as $index => $item) {
                $service = Service::findOrFail($item['request']['service_id']);
                $currentTerms = $this->terms($service);
                $acceptedTerms = $item['terms'];
                ksort($currentTerms);
                ksort($acceptedTerms);
                abort_unless($currentTerms === $acceptedTerms, 422, 'Las condiciones del servicio cambiaron. Consulta nuevamente.');
                $request = $item['request'] + ['expected_total' => $item['quote']['total'], 'idempotency_key' => (string) Str::uuid(),
                    'source' => 'web', 'client_user_id' => $user->id, '_suppress_dispatch' => true];
                if ($policy) {
                    $result = app(ReservationCheckoutService::class)->create($user, $request + ['payment_mode' => 'ON_SITE', 'accepted_terms' => true, 'expected_policy_version' => $policy->version]);
                    $ids[] = $result['appointment']['id'];
                } else {
                    $appointment = app(AppointmentService::class)->create($request)->data;
                    $appointment->update(['checkout_snapshot' => $item['terms'] + ['payment_mode' => 'ON_SITE', 'total' => $appointment->final_price, 'currency' => $appointment->currency,
                        'accepted_at' => now()->toIso8601String(), 'package_proposal_id' => $proposal->id]]);
                    $ids[] = $appointment->id;
                }
            }
            $proposal->update(['status' => 'CONFIRMED', 'appointment_ids' => $ids, 'idempotency_key' => $key]);
            return $proposal;
        }, 3);
    }

    public function present(PackageProposal $proposal): array
    {
        return ['id' => $proposal->id, 'status' => $proposal->status === 'PREVIEW' && $proposal->expires_at->isPast() ? 'EXPIRED' : $proposal->status,
            'snapshot' => $proposal->snapshot, 'expires_at' => $proposal->expires_at->toIso8601String(),
            'appointments' => $proposal->appointment_ids ? Appointment::whereIn('id', $proposal->appointment_ids)->get(['id', 'booking_code', 'date', 'start_time', 'status', 'payment_status']) : []];
    }

    private function terms(Service $service): array
    {
        return ['allow_cancellation' => (bool) $service->allow_cancellation, 'cancellation_notice_minutes' => (int) $service->cancellation_notice_minutes,
            'allow_reschedule' => (bool) $service->allow_reschedule, 'reschedule_notice_minutes' => (int) $service->reschedule_notice_minutes];
    }
}
