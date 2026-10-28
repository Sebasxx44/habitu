<?php

namespace App\Services;

use App\Core\DTOs\ServiceResponse;
use Illuminate\Support\Facades\Http;

class MercadoPagoService
{
    private string $baseUrl = 'https://api.mercadopago.com';
    private ?string $accessToken;
    private ?string $publicKey;

    public function __construct()
    {
        $this->accessToken = config('services.mercadopago.access_token', env('MERCADOPAGO_ACCESS_TOKEN'));
        $this->publicKey = config('services.mercadopago.public_key', env('MERCADOPAGO_PUBLIC_KEY'));
    }

    public function createPreference(array $items, array $payer, string $externalReference, array $backUrls = []): ServiceResponse
    {
        if (! $this->accessToken) {
            return ServiceResponse::error('Los pagos en línea no están configurados todavía.', null, 503);
        }
        try {
            $payload = [
                'items' => $items,
                'payer' => [
                    'name' => $payer['name'] ?? '',
                    'email' => $payer['email'] ?? '',
                ],
                'external_reference' => $externalReference,
                'back_urls' => array_merge([
                    'success' => config('app.frontend_url') . '/cliente/wallet?status=success',
                    'failure' => config('app.frontend_url') . '/cliente/wallet?status=failure',
                    'pending' => config('app.frontend_url') . '/cliente/wallet?status=pending',
                ], $backUrls),
                'auto_return' => 'approved',
                'notification_url' => config('app.url') . '/api/v2/webhooks/mercadopago',
            ];

            $response = Http::withToken($this->accessToken)->connectTimeout(5)->timeout(15)
                ->post("{$this->baseUrl}/checkout/preferences", $payload);

            if ($response->successful()) {
                return ServiceResponse::success($response->json(), 'Preferencia creada', 201);
            }

            return ServiceResponse::error('No se pudo iniciar el pago con MercadoPago.', null, 502);
        } catch (\Throwable $e) {
            return ServiceResponse::error('No se pudo conectar con el proveedor de pagos.', null, 502);
        }
    }

    public function createPayment(float $amount, string $description, string $payerEmail, array $paymentMethod = []): ServiceResponse
    {
        if (! $this->accessToken) {
            return ServiceResponse::error('Los pagos en línea no están configurados todavía.', null, 503);
        }
        try {
            $payload = [
                'transaction_amount' => $amount,
                'description' => $description,
                'payment_method_id' => $paymentMethod['id'] ?? 'pse',
                'payer' => [
                    'email' => $payerEmail,
                ],
            ];

            $response = Http::withToken($this->accessToken)->connectTimeout(5)->timeout(15)
                ->post("{$this->baseUrl}/v1/payments", $payload);

            if ($response->successful()) {
                return ServiceResponse::success($response->json(), 'Pago procesado', 201);
            }

            return ServiceResponse::error('El proveedor no pudo procesar el pago.', null, 502);
        } catch (\Throwable $e) {
            return ServiceResponse::error('No se pudo procesar el pago.', null, 502);
        }
    }

    public function getPayment(string $paymentId): ServiceResponse
    {
        if (! $this->accessToken) {
            return ServiceResponse::error('Los pagos en línea no están configurados todavía.', null, 503);
        }
        try {
            $response = Http::withToken($this->accessToken)->connectTimeout(5)->timeout(15)
                ->get("{$this->baseUrl}/v1/payments/{$paymentId}");

            if ($response->successful()) {
                return ServiceResponse::success($response->json(), 'Pago encontrado');
            }

            return ServiceResponse::error('Payment not found', null, 404);
        } catch (\Throwable $e) {
            return ServiceResponse::error('No se pudo verificar el pago.', null, 502);
        }
    }

    public function processWebhook(array $data): ServiceResponse
    {
        try {
            $type = $data['type'] ?? ($data['action'] ?? null);
            
            if ($type === 'payment' || str_contains($type ?? '', 'payment')) {
                $paymentId = $data['data']['id'] ?? null;
                if (! $paymentId) {
                    return ServiceResponse::error('Missing payment ID');
                }
                
                $paymentResponse = $this->getPayment($paymentId);
                if (! $paymentResponse->success) {
                    return $paymentResponse;
                }
                
                $payment = $paymentResponse->data;
                $status = $payment['status'] ?? 'unknown';
                $externalRef = $payment['external_reference'] ?? null;
                
                return ServiceResponse::success([
                    'payment_id' => $paymentId,
                    'status' => $status,
                    'external_reference' => $externalRef,
                    'amount' => $payment['transaction_amount'] ?? 0,
                    'currency' => $payment['currency_id'] ?? '',
                ], 'Webhook procesado');
            }
            
            return ServiceResponse::success(null, 'Webhook recibido');
        } catch (\Throwable $e) {
            return ServiceResponse::error('No se pudo verificar la notificación de pago.', null, 502);
        }
    }

    public function getPublicKey(): string
    {
        return $this->publicKey ?? '';
    }
}
