<?php

namespace App\Modules\Platform\Services;

use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class GoogleCalendarService
{
    protected string $clientId;
    protected string $clientSecret;
    protected string $redirectUri;
    protected string $tokenUrl = 'https://oauth2.googleapis.com/token';
    protected string $calendarApiBase = 'https://www.googleapis.com/calendar/v3';

    public function __construct()
    {
        $this->clientId = (string) config('services.google_calendar.client_id', '');
        $this->clientSecret = (string) config('services.google_calendar.client_secret', '');
        $this->redirectUri = (string) config('services.google_calendar.redirect_uri', config('app.url') . '/api/v2/google-calendar/callback');
    }

    public function configured(): bool
    {
        return $this->clientId !== '' && $this->clientSecret !== '';
    }

    public function consumeState(string $state): ?int
    {
        if (! preg_match('/^[a-f0-9]{64}$/', $state)) return null;
        $key = 'calendar.oauth.'.hash('sha256', $state);
        return Cache::lock($key.'.lock', 10)->block(3, fn () => Cache::pull($key));
    }

    private function readToken(string $token): string
    {
        try { return Crypt::decryptString($token); }
        catch (\Illuminate\Contracts\Encryption\DecryptException $exception) { return $token; }
    }

    /**
     * Generate the OAuth2 authorization URL for the professional to grant calendar access.
     */
    public function getAuthorizationUrl(int $professionalId): string
    {
        if (! $this->configured()) {
            throw ValidationException::withMessages(['calendar' => 'Google Calendar no está configurado.']);
        }
        $state = bin2hex(random_bytes(32));
        Cache::put('calendar.oauth.'.hash('sha256', $state), $professionalId, now()->addMinutes(10));

        $params = http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => 'https://www.googleapis.com/auth/calendar.events',
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return "https://accounts.google.com/o/oauth2/v2/auth?{$params}";
    }

    /**
     * Exchange authorization code for access and refresh tokens.
     */
    public function exchangeCode(string $code): ?array
    {
        if (! $this->configured()) return null;

        try {
            $response = Http::timeout(10)->asForm()->post($this->tokenUrl, [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->redirectUri,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Google Calendar Token Exchange Error: ');
            return null;
        } catch (\Throwable $e) {
            Log::warning('Google Calendar Token Exchange Exception: ');
            return null;
        }
    }

    /**
     * Refresh an expired access token using the stored refresh token.
     */
    public function refreshToken(string $refreshToken): ?array
    {
        if (! $this->configured()) return null;

        try {
            $response = Http::timeout(10)->asForm()->post($this->tokenUrl, [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Google Calendar Refresh Token Error: ');
            return null;
        } catch (\Throwable $e) {
            Log::warning('Google Calendar Refresh Exception: ');
            return null;
        }
    }

    /**
     * Store OAuth tokens for a professional.
     */
    public function storeTokens(int $professionalId, array $tokens): void
    {
        DB::table('platform.google_calendar_tokens')->updateOrInsert(
            ['professional_id' => $professionalId],
            [
                'access_token' => Crypt::encryptString($tokens['access_token']),
                'refresh_token' => isset($tokens['refresh_token']) ? Crypt::encryptString($tokens['refresh_token']) : DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->value('refresh_token'),
                'expires_at' => now()->addSeconds($tokens['expires_in'] ?? 3600),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    /**
     * Get a valid access token for a professional (auto-refreshes if expired).
     */
    public function getAccessToken(int $professionalId): ?string
    {
        $record = DB::table('platform.google_calendar_tokens')
            ->where('professional_id', $professionalId)
            ->first();

        if (!$record) {
            return null;
        }

        // If token is still valid, return it
        if (Carbon::parse($record->expires_at)->isFuture()) {
            return $this->readToken($record->access_token);
        }

        // Refresh the token
        if ($record->refresh_token) {
            $newTokens = $this->refreshToken($this->readToken($record->refresh_token));
            if ($newTokens) {
                DB::table('platform.google_calendar_tokens')
                    ->where('professional_id', $professionalId)
                    ->update([
                        'access_token' => Crypt::encryptString($newTokens['access_token']),
                        'expires_at' => now()->addSeconds($newTokens['expires_in'] ?? 3600),
                        'updated_at' => now(),
                    ]);
                return $newTokens['access_token'];
            }
        }

        return null;
    }

    /**
     * Push an ElegantBarb appointment as a Google Calendar event.
     */
    public function pushAppointmentToCalendar(Appointment $appointment): bool
    {
        $professionalId = $appointment->professional_id;
        if (! $professionalId || ! $this->configured()) return false;
        $accessToken = $this->getAccessToken($professionalId);

        if (!$accessToken) {
            Log::info("GoogleCalendar: No token for professional #{$professionalId}, skipping sync.");
            return false;
        }

        $startDateTime = Carbon::parse($appointment->date->format('Y-m-d') . ' ' . $appointment->start_time->format('H:i:s'), config('booking.timezone', 'America/Bogota'));
        $endDateTime = Carbon::parse($appointment->date->format('Y-m-d') . ' ' . ($appointment->end_time ? $appointment->end_time->format('H:i:s') : $startDateTime->copy()->addMinutes(30)->format('H:i:s')), config('booking.timezone', 'America/Bogota'));

        $event = [
            'summary' => 'ElegantBarb: ' . ($appointment->service->name ?? 'Cita'),
            'description' => sprintf(
                "Cliente: %s\nServicio: %s\nCódigo: %s\nGenerado automáticamente por ElegantBarb.",
                $appointment->client->name ?? 'Cliente',
                $appointment->service->name ?? 'Servicio',
                $appointment->booking_code
            ),
            'start' => [
                'dateTime' => $startDateTime->toIso8601String(),
                'timeZone' => config('booking.timezone', 'America/Bogota'),
            ],
            'end' => [
                'dateTime' => $endDateTime->toIso8601String(),
                'timeZone' => config('booking.timezone', 'America/Bogota'),
            ],
            'reminders' => [
                'useDefault' => false,
                'overrides' => [
                    ['method' => 'popup', 'minutes' => 30],
                ],
            ],
        ];

        if (! $this->configured()) return false;

        try {
            $mapping = DB::table('platform.google_calendar_events')->where('appointment_id', $appointment->id)->first();
            $endpoint = "{$this->calendarApiBase}/calendars/primary/events";
            $response = $mapping
                ? Http::timeout(10)->withToken($accessToken)->put($endpoint.'/'.rawurlencode($mapping->google_event_id), $event)
                : Http::timeout(10)->withToken($accessToken)->post($endpoint, $event);

            if ($response->successful()) {
                $googleEventId = $response->json('id');
                // Store the mapping for future updates/deletions
                DB::table('platform.google_calendar_events')->updateOrInsert(['appointment_id' => $appointment->id], [
                    'professional_id' => $professionalId,
                    'appointment_id' => $appointment->id,
                    'google_event_id' => $googleEventId,
                    'created_at' => now(),
                ]);

                Log::info("GoogleCalendar: Event created for appointment #{$appointment->id} => {$googleEventId}");
                return true;
            }

            Log::warning('GoogleCalendar push error: ');
            return false;
        } catch (\Throwable $e) {
            Log::warning('GoogleCalendar push exception: ');
            return false;
        }
    }

    /**
     * Delete a Google Calendar event when an appointment is cancelled.
     */
    public function deleteCalendarEvent(Appointment $appointment): bool
    {
        $mapping = DB::table('platform.google_calendar_events')
            ->where('appointment_id', $appointment->id)
            ->first();

        if (!$mapping) {
            return false;
        }

        $accessToken = $this->getAccessToken($mapping->professional_id);
        if (!$accessToken) {
            return false;
        }

        if (! $this->configured()) return false;

        try {
            $response = Http::timeout(10)->withToken($accessToken)
                ->delete("{$this->calendarApiBase}/calendars/primary/events/{$mapping->google_event_id}");

            DB::table('platform.google_calendar_events')->where('id', $mapping->id)->delete();
            return $response->successful() || $response->status() === 410;
        } catch (\Throwable $e) {
            Log::warning('GoogleCalendar delete exception: ');
            return false;
        }
    }

    /**
     * Process incoming Google Calendar webhook to block busy times in ElegantBarb.
     */
    public function processIncomingCalendarWebhook(int $professionalId, array $busySlots): void
    {
        // Only an authenticated fetch may change imported busy intervals.
        app(GoogleCalendarBusyService::class)->sync($professionalId);
    }

    /**
     * Check if a professional has connected their Google Calendar.
     */
    public function isConnected(int $professionalId): bool
    {
        return $this->configured() && DB::table('platform.google_calendar_tokens')
            ->where('professional_id', $professionalId)
            ->exists();
    }

    /**
     * Disconnect Google Calendar for a professional.
     */
    public function disconnect(int $professionalId): void
    {
        $record = DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->first();
        if ($record?->channel_id && $record?->channel_resource_id) {
            $accessToken = $this->getAccessToken($professionalId);
            if ($accessToken) {
                try { app(GoogleCalendarBusyService::class)->stopChannel($accessToken, $record->channel_id, $record->channel_resource_id); }
                catch (\Throwable $exception) { report($exception); }
            }
        }
        DB::transaction(function () use ($professionalId) {
            \App\Modules\People\Models\Professional::whereKey($professionalId)->lockForUpdate()->first();
            DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->lockForUpdate()->first();
            DB::table('platform.google_calendar_busy')->where('professional_id', $professionalId)->delete();
            DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->delete();
            DB::table('platform.google_calendar_events')->where('professional_id', $professionalId)->delete();
        });

        Log::info("GoogleCalendar: Professional #{$professionalId} disconnected.");
    }
}
