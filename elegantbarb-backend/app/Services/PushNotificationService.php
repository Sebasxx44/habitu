<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function configured(): bool
    {
        return (bool) config('push.enabled') && config('push.project_id') && config('push.client_email') && config('push.private_key');
    }

    public function sendToUser(int $userId, string $title, string $body, array $data = [], bool $promotional = false): array
    {
        $preferences = DB::table('platform.push_preferences')->where('user_id', $userId)->first();
        if (! $preferences || ! ($promotional ? $preferences->promotions_enabled : $preferences->transactional_enabled)) return [];
        if ($promotional) {
            $contact = DB::table('marketing.contact_preferences')->where('user_id', $userId)->where('promotions_enabled', true)->first();
            if (! $contact) return [];
            $time = now($contact->timezone)->format('H:i:s');
            $withinWindow = $contact->contact_start < $contact->contact_end
                ? $time >= $contact->contact_start && $time < $contact->contact_end
                : $time >= $contact->contact_start || $time < $contact->contact_end;
            if (! $withinWindow) return [];
        }
        $devices = DB::table('platform.push_devices')->where('user_id', $userId)->whereNull('revoked_at')->get(['id', 'user_id', 'token']);
        $results = [];
        foreach ($devices as $device) {
            $send = fn () => $this->deliverToToken(Crypt::decryptString($device->token), $title, $body, $data);
            $eventId = $data['event_id'] ?? null;
            $results[] = is_string($eventId) && preg_match('/^[a-zA-Z0-9_.:-]{1,120}$/', $eventId)
                ? app(PushDeliveryService::class)->attempt($device, $eventId, $send)
                : $send()['accepted'];
        }
        return $results;
    }

    public function sendToToken(string $token, string $title, string $body, array $data = []): bool
    {
        return $this->deliverToToken($token, $title, $body, $data)['accepted'];
    }

    private function deliverToToken(string $token, string $title, string $body, array $data): array
    {
        $failure = ['accepted' => false, 'permanent' => false, 'message_id' => null];
        if (! $this->configured()) return $failure;
        $accessToken = $this->accessToken();
        if (! $accessToken) return $failure;
        try {
            $response = Http::timeout(10)->withToken($accessToken)->post('https://fcm.googleapis.com/v1/projects/'.rawurlencode((string) config('push.project_id')).'/messages:send', [
                'message' => ['token' => $token, 'notification' => ['title' => $title, 'body' => $body],
                    'data' => (object) array_map(fn ($value) => is_scalar($value) ? (string) $value : json_encode($value), $data),
                    'webpush' => ['headers' => ['TTL' => '3600'], 'notification' => ['icon' => '/brand/habitu/symbol-color.svg']]],
            ]);
            if ($response->status() === 404 && collect($response->json('error.details', []))->contains(fn ($detail) => ($detail['errorCode'] ?? '') === 'UNREGISTERED')) {
                DB::table('platform.push_devices')->where('token_hash', hash('sha256', $token))->update(['revoked_at' => now(), 'updated_at' => now()]);
                return ['accepted' => false, 'permanent' => true, 'message_id' => null];
            }
            return ['accepted' => $response->successful(), 'permanent' => false, 'message_id' => $response->successful() && is_string($response->json('name')) ? substr($response->json('name'), 0, 255) : null];
        } catch (\Throwable $exception) {
            Log::warning('Push provider request failed', ['exception' => $exception::class]);
            return $failure;
        }
    }

    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        $results = [];
        foreach ($tokens as $token) $results[hash('sha256', $token)] = $this->sendToToken($token, $title, $body, $data);
        return $results;
    }

    public function sendToTopic(string $topic, string $title, string $body, array $data = []): bool
    {
        // Tenant-scoped consent cannot be guaranteed by arbitrary shared topics.
        return false;
    }

    private function accessToken(): ?string
    {
        return Cache::remember('push.oauth.'.hash('sha256', (string) config('push.client_email')), now()->addMinutes(50), function () {
            try {
                $assertion = JWT::encode(['iss' => config('push.client_email'), 'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => 'https://oauth2.googleapis.com/token', 'iat' => time(), 'exp' => time() + 3600],
                    str_replace('\\n', "\n", (string) config('push.private_key')), 'RS256');
                $response = Http::timeout(10)->asForm()->post('https://oauth2.googleapis.com/token', [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $assertion,
                ]);
                return $response->successful() ? $response->json('access_token') : null;
            } catch (\Throwable $exception) {
                Log::warning('Push provider authentication failed', ['exception' => $exception::class]);
                return null;
            }
        });
    }
}
