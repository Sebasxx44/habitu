<?php

namespace App\Modules\Platform\Services;

use App\Modules\Booking\Models\Appointment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $token;
    protected string $phoneNumberId;
    protected string $version = 'v19.0';
    protected string $baseUrl = 'https://graph.facebook.com';

    public function __construct()
    {
        $this->token = (string) config('services.whatsapp.access_token');
        $this->phoneNumberId = (string) config('services.whatsapp.phone_number_id');
    }

    public function sendTemplate(string $to, string $templateName, string $languageCode, array $components = []): bool
    {
        if ($this->token === '' || $this->phoneNumberId === '') {
            return false;
        }

        try {
            $url = "{$this->baseUrl}/{$this->version}/{$this->phoneNumberId}/messages";
            $response = Http::withToken($this->token)->connectTimeout(5)->timeout(15)->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => [
                        'code' => $languageCode,
                    ],
                    'components' => $components,
                ],
            ]);

            if ($response->successful()) {
                return true;
            }

            Log::warning('WhatsApp delivery failed', ['status' => $response->status()]);
            return false;
        } catch (\Throwable $e) {
            Log::warning('WhatsApp delivery unavailable');
            return false;
        }
    }

    public function sendBookingConfirmation(Appointment $appointment): bool
    {
        $clientPhone = $appointment->client->phone ?? null;
        if (!$clientPhone) {
            return false;
        }

        // Clean phone number (remove non-digits)
        $cleanPhone = preg_replace('/\D/', '', $clientPhone);
        if (empty($cleanPhone)) {
            return false;
        }

        $dateStr = $appointment->date->format('Y-m-d');
        $timeStr = $appointment->start_time->format('H:i');
        $serviceName = $appointment->service->name ?? 'Servicio';
        $professionalName = $appointment->professional->name ?? 'Profesional';

        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $appointment->client->name ?? 'Cliente'],
                    ['type' => 'text', 'text' => $serviceName],
                    ['type' => 'text', 'text' => "{$dateStr} a las {$timeStr}"],
                    ['type' => 'text', 'text' => $professionalName],
                    ['type' => 'text', 'text' => $appointment->booking_code],
                ],
            ],
            [
                'type' => 'button',
                'index' => '0',
                'sub_type' => 'quick_reply',
                'parameters' => [
                    ['type' => 'payload', 'payload' => "CONFIRM_APPOINTMENT_{$appointment->id}"],
                ],
            ],
            [
                'type' => 'button',
                'index' => '1',
                'sub_type' => 'quick_reply',
                'parameters' => [
                    ['type' => 'payload', 'payload' => "CANCEL_APPOINTMENT_{$appointment->id}"],
                ],
            ],
        ];

        return $this->sendTemplate($cleanPhone, 'booking_confirmation', 'es', $components);
    }

    public function send24hReminder(Appointment $appointment): bool
    {
        $clientPhone = $appointment->client->phone ?? null;
        if (!$clientPhone) {
            return false;
        }

        $cleanPhone = preg_replace('/\D/', '', $clientPhone);
        if (empty($cleanPhone)) {
            return false;
        }

        $dateStr = $appointment->date->format('d/m/Y');
        $timeStr = $appointment->start_time->format('H:i');
        $serviceName = $appointment->service->name ?? 'Servicio';

        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $appointment->client->name ?? 'Cliente'],
                    ['type' => 'text', 'text' => $serviceName],
                    ['type' => 'text', 'text' => "mañana {$dateStr} a las {$timeStr}"],
                ],
            ],
            [
                'type' => 'button',
                'index' => '0',
                'sub_type' => 'quick_reply',
                'parameters' => [
                    ['type' => 'payload', 'payload' => "CONFIRM_APPOINTMENT_{$appointment->id}"],
                ],
            ],
            [
                'type' => 'button',
                'index' => '1',
                'sub_type' => 'quick_reply',
                'parameters' => [
                    ['type' => 'payload', 'payload' => "CANCEL_APPOINTMENT_{$appointment->id}"],
                ],
            ],
            [
                'type' => 'button',
                'index' => '2',
                'sub_type' => 'quick_reply',
                'parameters' => [
                    ['type' => 'payload', 'payload' => "RESCHEDULE_APPOINTMENT_{$appointment->id}"],
                ],
            ],
        ];

        return $this->sendTemplate($cleanPhone, 'booking_24h_reminder', 'es', $components);
    }

    public function sendPostServiceSurvey(Appointment $appointment): bool
    {
        $clientPhone = $appointment->client->phone ?? null;
        if (!$clientPhone) {
            return false;
        }

        $cleanPhone = preg_replace('/\D/', '', $clientPhone);
        if (empty($cleanPhone)) {
            return false;
        }

        $professionalName = $appointment->professional->name ?? 'su profesional';

        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $appointment->client->name ?? 'Cliente'],
                    ['type' => 'text', 'text' => $professionalName],
                ],
            ],
        ];

        return $this->sendTemplate($cleanPhone, 'post_service_survey', 'es', $components);
    }

    public function sendCancellationNotification(Appointment $appointment): bool
    {
        $clientPhone = $appointment->client->phone ?? null;
        if (!$clientPhone) {
            return false;
        }

        $cleanPhone = preg_replace('/\D/', '', $clientPhone);
        if (empty($cleanPhone)) {
            return false;
        }

        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $appointment->client->name ?? 'Cliente'],
                    ['type' => 'text', 'text' => $appointment->booking_code],
                ],
            ],
        ];

        return $this->sendTemplate($cleanPhone, 'booking_cancelled', 'es', $components);
    }
}
