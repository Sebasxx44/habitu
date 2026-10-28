<?php

declare(strict_types=1);

namespace App\Modules\Catalog\Services;

use App\Modules\Booking\Models\Resource;
use App\Modules\Booking\Services\BookingRules;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use Illuminate\Validation\ValidationException;

final class ServiceBookingConfiguration
{
    public static function rules(): array
    {
        return [
            'booking_model' => 'sometimes|required|in:professional,resource,direct,optional_professional,capacity',
            'duration_mode' => 'sometimes|required|in:fixed,selectable',
            'duration_options' => 'nullable|array|min:1|max:24', 'duration_options.*' => 'required|integer|min:1|max:1440|distinct',
            'booking_capacity' => 'sometimes|integer|min:1|max:10000', 'slot_interval_minutes' => 'sometimes|integer|min:1|max:720',
            'buffer_minutes' => 'sometimes|integer|min:0|max:720', 'min_advance_minutes' => 'sometimes|integer|min:0|max:525600',
            'max_advance_days' => 'nullable|integer|min:1|max:730', 'requires_confirmation' => 'sometimes|boolean',
            'allow_cancellation' => 'sometimes|boolean', 'allow_reschedule' => 'sometimes|boolean',
            'cancellation_notice_minutes' => 'sometimes|integer|min:0|max:525600', 'reschedule_notice_minutes' => 'sometimes|integer|min:0|max:525600',
            'resource_professional_optional' => 'sometimes|boolean', 'resource_ids' => 'sometimes|array|max:200',
            'resource_ids.*' => 'required|integer|distinct',
        ];
    }

    public function normalize(array $data, int $businessId, ?Service $existing = null): array
    {
        $business = Business::findOrFail($businessId);
        $service = $existing ? clone $existing : new Service(['requires_professional' => $business->uses_professionals, 'booking_capacity' => 1]);
        $service->fill($data);
        $model = BookingRules::model($service, $business);
        $data['booking_model'] = $model;
        $data['requires_professional'] = in_array($model, ['professional', 'optional_professional'], true);
        if ($model !== 'resource') $data['resource_professional_optional'] = false;
        $options = $service->duration_options ?? [];
        if ($service->duration_mode === 'selectable') {
            if ($options === [] || ! in_array((int) $service->duration_minutes, $options, true)) $this->invalid('duration_options', 'Incluye la duración base entre las opciones.');
            foreach ($options as $duration) if ($duration % $service->duration_minutes !== 0 || $duration + $service->buffer_minutes >= 1440) $this->invalid('duration_options', 'Las duraciones deben ser múltiplos de la duración base y caber en un día.');
        }
        if ($service->max_advance_days && $service->min_advance_minutes >= $service->max_advance_days * 1440) $this->invalid('max_advance_days', 'La anticipación máxima debe superar la mínima.');
        if (isset($data['resource_ids'])) {
            $ids = Resource::where('business_id', $businessId)->whereIn('id', $data['resource_ids'])->pluck('id');
            if ($ids->count() !== count($data['resource_ids'])) $this->invalid('resource_ids', 'Los recursos deben pertenecer al negocio.');
        }
        if ($model === 'resource' && ($data['resource_ids'] ?? $existing?->resources()->pluck('booking.resources.id')->all() ?? []) === []) $this->invalid('resource_ids', 'Vincula al menos un recurso al servicio.');
        return $data;
    }

    private function invalid(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
