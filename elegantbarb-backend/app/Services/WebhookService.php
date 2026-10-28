<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookService
{
    public function __construct(private WebhookDestinationService $destinations) {}

    public function dispatch(string $event, array $payload, ?int $userId = null): void
    {
        // An event must name its owner; there is no cross-tenant broadcast fallback.
        if (! $userId) return;
        $webhooks = DB::table('platform.outgoing_webhooks')->where('active', true)->where('user_id', $userId)->get();
        foreach ($webhooks as $webhook) {
            $events = json_decode($webhook->events, true) ?? [];
            if (in_array('*', $events, true) || in_array($event, $events, true)) $this->send($webhook, $event, $payload);
        }
    }

    public function deliverQueued(object $webhook, object $delivery): bool
    {
        return $this->send($webhook, $delivery->event, json_decode($delivery->payload, true, 512, JSON_THROW_ON_ERROR), $delivery->id);
    }

    protected function send(object $webhook, string $event, array $payload, ?int $deliveryId = null): bool
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $deliveryId ??= DB::table('platform.webhook_deliveries')->insertGetId([
            'webhook_id' => $webhook->id, 'event' => $event, 'payload' => $body, 'attempt' => 1,
            'sent_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        try {
            DB::table('platform.webhook_deliveries')->where('id', $deliveryId)->update(['sent_at' => now()]);
            $destination = $this->destinations->resolve($webhook->url);
            $response = Http::connectTimeout(3)->timeout(min(15, max(1, (int) $webhook->timeout)))
                ->withOptions([
                    'allow_redirects' => false,
                    'proxy' => '',
                    'curl' => [CURLOPT_RESOLVE => [$destination['host'].':443:'.$destination['address']]],
                ])->withHeaders([
                    'X-Webhook-Signature' => 'sha256='.hash_hmac('sha256', $body, $webhook->secret),
                    'X-Webhook-Event' => $event, 'X-Webhook-Id' => (string) $webhook->id,
                    'User-Agent' => 'ElegantBarb-Webhook/1.0',
                ])->withBody($body, 'application/json')->post($webhook->url);
            DB::table('platform.webhook_deliveries')->where('id', $deliveryId)->update([
                'status_code' => $response->status(),
                'response_body' => null,
                'error_message' => $response->successful() ? null : 'El destino rechazó la entrega.',
                'completed_at' => now(), 'updated_at' => now(),
            ]);
            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('Webhook delivery failed', ['webhook_id' => $webhook->id, 'exception' => $e::class]);
            DB::table('platform.webhook_deliveries')->where('id', $deliveryId)->update([
                'error_message' => 'No fue posible entregar el evento al destino autorizado.',
                'completed_at' => now(), 'updated_at' => now(),
            ]);
            return false;
        }
    }
}
