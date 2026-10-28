<?php

declare(strict_types=1);

namespace App\Modules\Finance\Services;

use App\Modules\Finance\Models\CheckoutOrder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/** Protocol: https://docs.wompi.co/docs/colombia/widget-checkout-web/ and /eventos/. */
final class WompiGateway
{
    public function environment(): string { return config('services.wompi.environment', 'test'); }

    public function enabled(): bool
    {
        $environment = $this->environment();
        if (! in_array($environment, ['test', 'prod'], true) || (app()->environment('production') && $environment !== 'prod')) return false;
        $prefixes = ['public_key' => 'pub_'.$environment.'_', 'private_key' => 'prv_'.$environment.'_',
            'integrity_secret' => $environment.'_integrity_', 'events_secret' => $environment.'_events_'];
        foreach ($prefixes as $key => $prefix) {
            $value = (string) config('services.wompi.'.$key);
            if (! str_starts_with($value, $prefix) || strlen($value) <= strlen($prefix) || preg_match('/\s/', $value)) return false;
        }
        $frontend = parse_url((string) config('services.wompi.frontend_url'));
        return is_array($frontend) && ! empty($frontend['host']) && ! isset($frontend['user']) && ! isset($frontend['pass'])
            && in_array($frontend['scheme'] ?? '', $environment === 'prod' ? ['https'] : ['http', 'https'], true)
            && ! isset($frontend['query']) && ! isset($frontend['fragment']);
    }

    public function checkoutOptions(CheckoutOrder $order): array
    {
        $expiration = $order->expires_at->utc()->format('Y-m-d\TH:i:s.v\Z');
        $signature = hash('sha256', $order->reference.$order->amount_in_cents.$order->currency.$expiration.config('services.wompi.integrity_secret'));
        $route = match ($order->purpose) {
            'membership' => '/cliente/memberships', 'reservation' => '/cliente/checkout/'.$order->id, default => '/cliente/wallet',
        };
        return ['publicKey' => config('services.wompi.public_key'), 'currency' => $order->currency,
            'amountInCents' => $order->amount_in_cents, 'reference' => $order->reference,
            'signature' => ['integrity' => $signature], 'expirationTime' => $expiration,
            'redirectUrl' => rtrim(config('services.wompi.frontend_url'), '/').$route.'?checkout='.$order->id];
    }

    public function checkoutUrl(CheckoutOrder $order): string
    {
        $options = $this->checkoutOptions($order);
        return 'https://checkout.wompi.co/p/?'.http_build_query([
            'public-key' => $options['publicKey'], 'currency' => $options['currency'],
            'amount-in-cents' => $options['amountInCents'], 'reference' => $options['reference'],
            'signature:integrity' => $options['signature']['integrity'], 'expiration-time' => $options['expirationTime'],
            'redirect-url' => $options['redirectUrl'],
        ], '', '&', PHP_QUERY_RFC3986);
    }

    public function verifyEvent(array $event): string
    {
        if (! $this->enabled()) abort(503, 'Wompi no está configurado.');
        $properties = data_get($event, 'signature.properties');
        $checksum = data_get($event, 'signature.checksum');
        if (($event['event'] ?? '') !== 'transaction.updated' || ($event['environment'] ?? '') !== $this->environment()
            || ! is_array($properties) || count($properties) > 30 || ! is_string($checksum) || ! preg_match('/^[a-f0-9]{64}$/i', $checksum)
            || ! is_int($event['timestamp'] ?? null) || $event['timestamp'] > time() + 300) abort(400, 'Evento no válido.');
        foreach (['transaction.id', 'transaction.status', 'transaction.amount_in_cents'] as $required) {
            if (! in_array($required, $properties, true)) abort(400, 'Firma incompleta.');
        }
        $concatenated = '';
        foreach ($properties as $property) {
            if (! is_string($property) || ! preg_match('/^transaction\.[a-zA-Z0-9_.]+$/', $property)) abort(400, 'Propiedad no válida.');
            $value = data_get($event['data'] ?? [], $property);
            if (! is_string($value) && ! is_int($value)) abort(400, 'Valor firmado no válido.');
            $concatenated .= (string) $value;
        }
        $expected = hash('sha256', $concatenated.$event['timestamp'].config('services.wompi.events_secret'));
        if (! hash_equals($expected, strtolower($checksum))) abort(401, 'Firma de evento no válida.');
        $id = data_get($event, 'data.transaction.id');
        if (! is_string($id) || ! preg_match('/^[a-zA-Z0-9-]{1,100}$/', $id)) abort(400, 'Transacción no válida.');
        return $id;
    }

    public function transaction(string $id): array
    {
        $host = $this->environment() === 'prod' ? 'production' : 'sandbox';
        try {
            $response = Http::acceptJson()->withToken(config('services.wompi.private_key'))->connectTimeout(5)->timeout(15)
                ->get('https://'.$host.'.wompi.co/v1/transactions/'.rawurlencode($id));
        } catch (ConnectionException $exception) {
            abort(503, 'La verificación con Wompi está pendiente. No repitas el pago; consulta su estado nuevamente.');
        }
        if (! $response->successful()) abort(503, 'No se pudo verificar la transacción con Wompi.');
        $data = $response->json('data');
        if (! is_array($data) || ($data['id'] ?? '') !== $id || ! is_int($data['amount_in_cents'] ?? null)
            || ! is_string($data['reference'] ?? null) || ! is_string($data['currency'] ?? null)
            || ! is_string($data['status'] ?? null)
            || (isset($data['payment_method_type']) && ! is_string($data['payment_method_type']))) {
            throw ValidationException::withMessages(['transaction' => 'Respuesta de pago no válida.']);
        }
        return $data;
    }
}
