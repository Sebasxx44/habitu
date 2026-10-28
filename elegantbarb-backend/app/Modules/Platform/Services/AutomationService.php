<?php

namespace App\Modules\Platform\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Booking\Models\Appointment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Facades\DB;

class AutomationService implements ServiceInterface
{
    public function all(array $filters = []): ServiceResponse
    {
        return ServiceResponse::success([], 'Automation service active');
    }

    public function find(int $id): ServiceResponse
    {
        return ServiceResponse::success(null, 'Automation service');
    }

    public function create(array $data): ServiceResponse
    {
        return ServiceResponse::success(null, 'Automation service');
    }

    public function update(int $id, array $data): ServiceResponse
    {
        return ServiceResponse::success(null, 'Automation service');
    }

    public function delete(int $id): ServiceResponse
    {
        return ServiceResponse::success(null, 'Automation service');
    }

    /**
     * Auto-assign closest available professional to on-demand request
     */
    public function autoAssignOnDemand(int $requestId): ServiceResponse
    {
        return app(\App\Modules\OnDemand\Services\OnDemandOfferService::class)->offer($requestId);
    }

    /**
     * Auto-accept appointment if professional has availability
     */
    public function autoAcceptAppointment(int $appointmentId): ServiceResponse
    {
        return DB::transaction(function () use ($appointmentId) {
            $appointment = Appointment::whereKey($appointmentId)->lockForUpdate()->first();
            if (! $appointment || $appointment->getRawOriginal('status') !== 'PENDING') return ServiceResponse::error('La reserva no está pendiente.', null, 409);
            app(\App\Modules\Booking\Services\AvailabilityService::class)->reserve($appointment->getAttributes(), $appointment->id);
            return app(\App\Modules\Booking\Services\AppointmentService::class)->update($appointment->id, ['status' => 'CONFIRMED']);
        });
    }

    public function calculateDynamicPrice(int $serviceId, ?string $date = null, ?string $time = null): ServiceResponse
    {
        $service = \App\Modules\Catalog\Models\Service::find($serviceId);
        if (! $service) return ServiceResponse::notFound('Servicio');
        $result = app(\App\Modules\Catalog\Services\DynamicPricingService::class)->evaluate([
            'business_id' => $service->business_id, 'service_id' => $service->id, 'price' => $service->price,
            'currency' => $service->currency ?? $service->business?->currency ?? 'COP',
            'date' => $date ?? now(config('booking.timezone'))->toDateString(), 'start_time' => $time ?? '00:00',
        ]);
        return ServiceResponse::success([...$result, 'dynamic_price' => $result['price'], 'source' => 'configured_business_rules']);
    }

}
