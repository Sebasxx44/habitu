<?php

namespace App\Modules\Booking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Booking\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function __construct(
        private AppointmentService $service
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'business_id' => 'sometimes|integer', 'client_id' => 'sometimes|integer', 'professional_id' => 'sometimes|integer',
            'branch_id' => 'sometimes|integer|min:1', 'search' => 'sometimes|string|max:100',
            'date' => 'sometimes|date_format:Y-m-d', 'status' => 'sometimes|string|in:PENDING,CONFIRMED,COMPLETED,CANCELLED,NO_SHOW,RESCHEDULED',
            'view' => 'sometimes|in:upcoming,completed,cancelled', 'per_page' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1', 'date_from' => 'sometimes|date_format:Y-m-d', 'date_to' => 'sometimes|date_format:Y-m-d',
        ]);
        $user = $request->user();

        if ($user?->role === 'CLIENTE') {
            unset($filters['client_id']);
            $filters['client_user_id'] = $user->id;
        } elseif ($user?->role === 'PROFESSIONAL') {
            $filters['professional_id'] = $user->barber_id
                ?: \App\Modules\People\Models\Professional::where('user_id', $user->id)->value('id') ?: -1;
        } elseif ($user?->role === 'ADMIN_BARBERIA' && empty($filters['business_id'])) {
            $filters['business_id'] = $user->barber_shop_id
                ?: \App\Modules\Business\Models\Business::where('owner_user_id', $user->id)->value('id') ?: -1;
        }

        $response = $this->service->all($filters, $user);
        return $response->toJsonResponse();
    }

    public function show(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id)) {
            return $blocked;
        }

        $response = $this->service->find($id, $request->user());
        return $response->toJsonResponse();
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\Business::class, 'id')],
            'branch_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Business\Models\BusinessBranch::class, 'id')],
            'client_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Client::class, 'id')],
            'professional_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Professional::class, 'id')],
            'service_id' => ['required', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Catalog\Models\Service::class, 'id')],
            'resource_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\Booking\Models\Resource::class, 'id')],
            'date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'price' => 'sometimes|numeric|min:0',
            'promo_code' => 'nullable|string|max:255',
            'idempotency_key' => 'nullable|uuid',
            'expected_total' => 'nullable|numeric|min:0|decimal:0,2',
            'notes' => 'nullable|string|max:2000',
            'source' => 'nullable|string|in:web,app,widget,admin,whatsapp',
        ]);

        $user = $request->user();
        if ($user->role === 'CLIENTE') {
            $data['client_user_id'] = $user->id;
            unset($data['client_id']);
        } else {
            abort_unless(! empty($data['client_id']), 422, 'Selecciona un cliente.');
            $data['_checkout_authorized'] = true;
        }
        $response = $this->service->create($data);
        if ($response->success) $response->data = app(\App\Modules\Booking\Services\AppointmentPresentationService::class)->present($response->data, $user, true);
        return $response->toJsonResponse();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id, false)) {
            return $blocked;
        }

        $data = $request->validate([
            'status' => 'sometimes|string|in:PENDING,CONFIRMED,COMPLETED,CANCELLED,NO_SHOW,RESCHEDULED',
            'payment_status' => 'prohibited',
            'notes' => 'nullable|string|max:2000',
        ]);

        $response = $this->service->update($id, $data);
        return $response->toJsonResponse();
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id, false)) {
            return $blocked;
        }

        $response = $this->service->delete($id);
        return $response->toJsonResponse();
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id)) {
            return $blocked;
        }

        $data = $request->validate(['reason' => 'nullable|string|max:500']);
        $reason = $data['reason'] ?? null;
        $cancelledBy = $request->user()?->id;

        $response = $this->service->cancel($id, $reason, $cancelledBy);
        return $response->toJsonResponse();
    }

    public function reschedule(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id)) {
            return $blocked;
        }

        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'professional_id' => ['nullable', 'integer', \Illuminate\Validation\Rule::exists(\App\Modules\People\Models\Professional::class, 'id')],
            'resource_id' => 'nullable|integer|min:1',
            'reason' => 'nullable|string|max:500',
        ]);

        $response = $this->service->reschedule($id, $data, $request->user()?->id);
        return $response->toJsonResponse();
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        if ($blocked = $this->authorizeAppointmentAccess($request, $id, false)) {
            return $blocked;
        }

        $response = $this->service->complete($id);
        return $response->toJsonResponse();
    }

    public function stats(Request $request): JsonResponse
    {
        $businessId = $request->input('business_id');
        if (! $businessId) {
            return response()->json(['error' => 'business_id required'], 422);
        }

        $response = $this->service->getStats((int) $businessId);
        return $response->toJsonResponse();
    }

    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer|min:1', 'branch_id' => 'required|integer|min:1',
            'service_id' => 'required|integer|min:1', 'professional_id' => 'nullable|integer|min:1',
            'resource_id' => 'nullable|integer|min:1', 'date' => 'required|date_format:Y-m-d',
            'appointment_id' => 'nullable|integer|min:1',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000',
            'time_from' => 'nullable|date_format:H:i', 'time_to' => 'nullable|date_format:H:i',
        ]);
        if (! empty($data['appointment_id']) && ($blocked = $this->authorizeAppointmentAccess($request, (int) $data['appointment_id']))) {
            return $blocked;
        }
        if (! empty($data['appointment_id'])) {
            $appointment = \App\Modules\Booking\Models\Appointment::findOrFail($data['appointment_id']);
            foreach (['business_id', 'branch_id', 'service_id'] as $field) {
                if ((int) $data[$field] !== (int) $appointment->$field) throw \Illuminate\Validation\ValidationException::withMessages([$field => 'Consulta la disponibilidad del servicio y la sede de esta reserva.']);
            }
            $data['duration_minutes'] = $appointment->duration_minutes ?? $appointment->service->duration_minutes;
            $data['participants'] = $appointment->participants;
            if (\App\Modules\Booking\Services\BookingRules::retainsLegacyProfessional($appointment)) {
                if (isset($data['professional_id']) && (int) $data['professional_id'] !== (int) $appointment->professional_id) throw \Illuminate\Validation\ValidationException::withMessages(['professional_id' => 'Esta reserva conserva su asignación histórica.']);
                $data['professional_id'] = $appointment->professional_id;
                $data['_retain_legacy_professional'] = true;
            }
        }
        if ($request->user()->role === 'CLIENTE') $data['client_user_id'] = $request->user()->id;
        return \App\Core\DTOs\ServiceResponse::success(app(\App\Modules\Booking\Services\AvailabilityService::class)->slots($data))->toJsonResponse();
    }

    public function quote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|integer|min:1', 'branch_id' => 'required|integer|min:1',
            'service_id' => 'required|integer|min:1', 'professional_id' => 'nullable|integer|min:1',
            'resource_id' => 'nullable|integer|min:1', 'date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'duration_minutes' => 'nullable|integer|min:1|max:1440', 'participants' => 'nullable|integer|min:1|max:10000', 'promo_code' => 'nullable|string|max:255',
        ]);
        $clientId = \App\Modules\People\Models\Client::where('user_id', $request->user()->id)->value('id');
        if ($request->user()->role === 'CLIENTE') $data['client_user_id'] = $request->user()->id;
        $reservation = app(\App\Modules\Booking\Services\AvailabilityService::class)->resolve($data);
        return \App\Core\DTOs\ServiceResponse::success(app(\App\Modules\Booking\Services\AppointmentPricingService::class)->quote($reservation, $clientId))->toJsonResponse();
    }

    private function authorizeAppointmentAccess(Request $request, int $id, bool $allowClient = true): ?JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }
        if ($user->role === 'SUPERADMIN') {
            return null;
        }

        $appointment = \App\Modules\Booking\Models\Appointment::find($id);
        if (! $appointment) {
            return null;
        }

        $allowed = match ($user->role) {
            'CLIENTE' => $allowClient && (int) $appointment->client?->user_id === (int) $user->id,
            'PROFESSIONAL' => (int) $appointment->professional?->user_id === (int) $user->id,
            'ADMIN_BARBERIA' => $appointment->business_id == $user->barber_shop_id
                || \App\Modules\Business\Models\Business::where('id', $appointment->business_id)
                    ->where('owner_user_id', $user->id)
                    ->exists(),
            default => false,
        };

        return $allowed ? null : response()->json(['error' => 'Forbidden.'], 403);
    }
}
