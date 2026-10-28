<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class WebhookDestinationService
{
    public function resolve(string $url): array
    {
        $parts = parse_url($url);
        $host = strtolower($parts['host'] ?? '');
        $allowed = config('services.webhooks.allowed_hosts', []);
        if (! $parts || ($parts['scheme'] ?? '') !== 'https' || ($parts['port'] ?? 443) !== 443
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])
            || ! preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/D', $host)
            || ! in_array($host, $allowed, true) || filter_var($host, FILTER_VALIDATE_IP)) {
            throw ValidationException::withMessages(['url' => 'Usa HTTPS y un dominio de webhooks autorizado por la plataforma.']);
        }
        $addresses = $this->addresses($host);
        if ($addresses === []) {
            throw ValidationException::withMessages(['url' => 'No se pudo resolver el destino del webhook.']);
        }
        foreach ($addresses as $address) {
            if (! filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_GLOBAL_RANGE)) {
                throw ValidationException::withMessages(['url' => 'El destino debe resolver únicamente a direcciones públicas.']);
            }
        }
        $address = $addresses[0];
        return ['host' => $host, 'address' => str_contains($address, ':') ? "[$address]" : $address];
    }

    protected function addresses(string $host): array
    {
        $records = dns_get_record($host, DNS_A | DNS_AAAA);
        if ($records === false) return [];
        return array_values(array_filter(array_map(fn ($record) => $record['ip'] ?? $record['ipv6'] ?? null, $records)));
    }
}
