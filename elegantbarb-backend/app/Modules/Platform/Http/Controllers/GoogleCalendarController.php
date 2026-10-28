<?php

namespace App\Modules\Platform\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Platform\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleCalendarController extends Controller
{
    public function __construct(private GoogleCalendarService $calendarService) {}

    /**
     * Get the OAuth2 authorization URL for a professional.
     */
    public function getAuthUrl(Request $request): JsonResponse
    {
        $professionalId = $request->input('professional_id');

        if (!$professionalId) {
            return ServiceResponse::error('No se identificó al profesional.', null, 400)->toJsonResponse();
        }

        $url = $this->calendarService->getAuthorizationUrl($professionalId);

        return ServiceResponse::success(['auth_url' => $url], 'URL de autorización generada')->toJsonResponse();
    }

    /**
     * OAuth2 callback after the professional grants calendar access.
     */
    public function handleCallback(Request $request): JsonResponse
    {
        $code = $request->query('code');
        $state = $request->query('state');

        if (!$code || !$state) {
            return ServiceResponse::error('Parámetros de callback inválidos.', null, 400)->toJsonResponse();
        }

        $professionalId = is_string($state) ? $this->calendarService->consumeState($state) : null;

        if (!$professionalId) {
            return ServiceResponse::error('No se pudo identificar al profesional.', null, 400)->toJsonResponse();
        }

        $tokens = $this->calendarService->exchangeCode($code);

        if (!$tokens) {
            return ServiceResponse::error('Error al intercambiar el código de autorización.', null, 500)->toJsonResponse();
        }

        $this->calendarService->storeTokens($professionalId, $tokens);

        Log::info("GoogleCalendar: Professional #{$professionalId} connected successfully.");

        return ServiceResponse::success(null, 'Google Calendar conectado exitosamente.')->toJsonResponse();
    }

    /**
     * Check if the current professional has Google Calendar connected.
     */
    public function status(Request $request): JsonResponse
    {
        $professionalId = $request->input('professional_id');

        if (!$professionalId) {
            return ServiceResponse::success(['connected' => false], 'Estado de Google Calendar')->toJsonResponse();
        }

        return ServiceResponse::success(app(\App\Modules\Platform\Services\GoogleCalendarBusyService::class)
            ->status((int) $professionalId), 'Estado de Google Calendar')->toJsonResponse();
    }

    /**
     * Disconnect Google Calendar for the professional.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $professionalId = $request->input('professional_id');

        if (!$professionalId) {
            return ServiceResponse::error('No se identificó al profesional.', null, 400)->toJsonResponse();
        }

        $this->calendarService->disconnect($professionalId);

        return ServiceResponse::success(null, 'Google Calendar desconectado.')->toJsonResponse();
    }

    /**
     * Incoming webhook from Google Calendar (push notifications).
     * This is a public endpoint that Google calls when calendar events change.
     */
    public function incomingWebhook(Request $request): JsonResponse
    {
        $professionalId = app(\App\Modules\Platform\Services\GoogleCalendarBusyService::class)->acceptWebhook(
            (string) $request->header('X-Goog-Channel-ID'), (string) $request->header('X-Goog-Channel-Token'),
            (string) $request->header('X-Goog-Resource-ID'), (string) $request->header('X-Goog-Message-Number'));
        abort_unless($professionalId, 403);
        \App\Jobs\SyncGoogleCalendarBusy::dispatch($professionalId);
        return response()->json(['accepted' => true]);
    }

    /**
     * Manually trigger a sync for the current professional.
     */
    public function syncBusy(Request $request): JsonResponse
    {
        $professionalId = (int) $request->input('professional_id');
        abort_unless($professionalId, 422);
        return ServiceResponse::success(app(\App\Modules\Platform\Services\GoogleCalendarBusyService::class)
            ->sync($professionalId), 'Intervalos ocupados importados sin modificar las reservas.')->toJsonResponse();
    }

    public function triggerSync(Request $request): JsonResponse
    {
        $professionalId = $request->input('professional_id');

        if (!$professionalId) {
            return ServiceResponse::error('No se identificó al profesional.', null, 400)->toJsonResponse();
        }

        if (!$this->calendarService->isConnected($professionalId)) {
            return ServiceResponse::error('Google Calendar no está conectado.', null, 400)->toJsonResponse();
        }

        $appointments = \App\Modules\Booking\Models\Appointment::where('professional_id', $professionalId)
            ->whereDate('date', '>=', today())->whereIn('status', ['PENDING', 'CONFIRMED'])->limit(30)->get();
        $synced = $appointments->filter(fn ($appointment) => $this->calendarService->pushAppointmentToCalendar($appointment))->count();
        if ($synced !== $appointments->count()) return ServiceResponse::error('Algunas citas no pudieron sincronizarse. Reintenta más tarde.', null, 502)->toJsonResponse();
        return ServiceResponse::success(['synced' => $synced], 'Citas sincronizadas con Google Calendar.')->toJsonResponse();
    }
}
