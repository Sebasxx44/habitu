<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\Enums\AppointmentStatus;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Platform\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WhatsAppWebhookController extends Controller
{
    public function verify(Request $request): Response|JsonResponse
    {
        $verifyToken = (string) config('services.whatsapp.verify_token');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');
        if ($request->query('hub_mode') === 'subscribe' && $verifyToken !== '' && is_string($token)
            && hash_equals($verifyToken, $token) && is_string($challenge)) {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }
        return response()->json(['error' => 'Forbidden'], 403);
    }

    public function handle(Request $request): JsonResponse
    {
        $secret = (string) config('services.whatsapp.app_secret');
        $signature = (string) $request->header('X-Hub-Signature-256', '');
        if ($secret === '' || ! hash_equals('sha256=' . hash_hmac('sha256', $request->getContent(), $secret), $signature)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $data = $request->validate([
            'object' => 'required|in:whatsapp_business_account',
            'entry' => 'required|array|max:100', 'entry.*.changes' => 'required|array|max:100',
            'entry.*.changes.*.value' => 'required|array',
            'entry.*.changes.*.value.messages' => 'sometimes|array|max:100',
            'entry.*.changes.*.value.messages.*.from' => 'required|string|regex:/^[0-9]{10,15}$/',
            'entry.*.changes.*.value.messages.*.type' => 'required|string|max:50',
            'entry.*.changes.*.value.messages.*.button.payload' => 'sometimes|string|max:120',
            'entry.*.changes.*.value.messages.*.interactive.button_reply.id' => 'sometimes|string|max:120',
            'entry.*.changes.*.value.messages.*.text.body' => 'sometimes|string|max:4096',
        ]);
        foreach ($data['entry'] as $entry) {
            foreach ($entry['changes'] as $change) {
                foreach ($change['value']['messages'] ?? [] as $message) {
                    $this->processMessage($message);
                }
            }
        }
        return response()->json(['status' => 'ok']);
    }

    private function processMessage(array $message): void
    {
        $payload = match ($message['type']) {
            'interactive' => $message['interactive']['button_reply']['id'] ?? '',
            'button' => $message['button']['payload'] ?? '',
            'text' => $message['text']['body'] ?? '',
            default => '',
        };
        if (! is_string($payload)) {
            return;
        }
        $payload = strtoupper(trim($payload));
        $id = null;
        if (preg_match('/^(CONFIRM|CANCEL|RESCHEDULE)_APPOINTMENT_(\d+)$/', $payload, $matches)) {
            $action = $matches[1];
            $id = (int) $matches[2];
        } else {
            $action = ['CONFIRMAR' => 'CONFIRM', 'CANCELAR' => 'CANCEL', 'REPROGRAMAR' => 'RESCHEDULE'][$payload] ?? null;
        }
        if (! $action) {
            return;
        }
        $phones = [$message['from']];
        $prefix = (string) config('services.whatsapp.default_country_code', '57');
        if (str_starts_with($message['from'], $prefix) && strlen($message['from']) === strlen($prefix) + 10) {
            $phones[] = substr($message['from'], strlen($prefix));
        }
        try {
            DB::transaction(function () use ($id, $action, $phones): void {
                $query = Appointment::with('client')->whereHas('client', fn ($client) => $client
                    ->whereIn(DB::raw("regexp_replace(phone, '[^0-9]', '', 'g')"), $phones))
                    ->whereIn('status', [AppointmentStatus::PENDING, AppointmentStatus::CONFIRMED, AppointmentStatus::RESCHEDULED]);
                if ($id) {
                    $query->whereKey($id);
                } else {
                    $query->where('date', '>=', now(config('booking.timezone'))->toDateString());
                }
                $appointment = $query->orderBy('date')->orderBy('start_time')->lockForUpdate()->first();
                if (! $appointment) {
                    return;
                }
                $service = app(AppointmentService::class);
                if ($action === 'CONFIRM' && $appointment->status === AppointmentStatus::PENDING) {
                    $service->update($appointment->id, ['status' => AppointmentStatus::CONFIRMED->value]);
                } elseif ($action === 'CANCEL') {
                    $service->cancel($appointment->id, 'Cancelado por el cliente vía WhatsApp', $appointment->client->user_id);
                } elseif ($action === 'RESCHEDULE' && $appointment->client->user_id) {
                    // Requesting a change must not alter the reservation before a new slot is selected.
                    Notification::firstOrCreate([
                        'user_id' => $appointment->client->user_id,
                        'type' => 'appointment_reschedule_requested',
                        'message' => "Para reprogramar tu cita #{$appointment->id}, abre Mis citas y selecciona un horario disponible.",
                    ], ['title' => 'Elige un nuevo horario', 'data' => ['appointment_id' => $appointment->id], 'read' => false]);
                }
            });
        } catch (ValidationException) {
            // A replay or concurrent terminal transition is acknowledged without reopening the appointment.
        }
    }
}
