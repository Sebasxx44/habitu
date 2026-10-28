<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class GoogleIdentityService
{
    public function verify(string $token): array
    {
        $clientId = config('services.google.client_id');
        if (! is_string($clientId) || $clientId === '') {
            throw ValidationException::withMessages(['id_token' => 'El acceso con Google no está configurado.']);
        }

        try {
            $header = JWT::jsonDecode(JWT::urlsafeB64Decode(explode('.', $token)[0]));
            if (($header->alg ?? '') !== 'RS256' || ! is_string($header->kid ?? null) || strlen($header->kid) > 255) {
                throw new \UnexpectedValueException('Invalid identity signing key.');
            }
            $certificates = Cache::get('google.identity.certificates');
            if (! is_array($certificates) || ! isset($certificates[$header->kid])) {
                $certificates = $this->refreshCertificates();
            }
            $keys = array_map(fn (string $certificate) => new Key($certificate, 'RS256'), $certificates);
            $claims = (array) JWT::decode($token, $keys);
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['id_token' => 'No se pudo verificar la identidad de Google.']);
        }

        if (($claims['aud'] ?? null) !== $clientId
            || ! in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)
            || ($claims['exp'] ?? 0) <= time()
            || ! is_string($claims['sub'] ?? null)
            || $claims['sub'] === ''
            || strlen($claims['sub']) > 255
            || ($claims['email_verified'] ?? false) !== true
            || ! filter_var($claims['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages(['id_token' => 'La credencial de Google no es válida para esta aplicación.']);
        }

        return $claims;
    }

    private function refreshCertificates(): array
    {
        $response = Http::timeout(5)->get('https://www.googleapis.com/oauth2/v1/certs')->throw();
        $certificates = $response->json();
        if (! is_array($certificates) || $certificates === [] || array_filter($certificates, fn ($certificate) => ! is_string($certificate))) {
            throw new \UnexpectedValueException('Invalid Google certificate response.');
        }
        preg_match('/max-age=(\d+)/i', $response->header('Cache-Control'), $cacheControl);
        $lifetime = max(60, min((int) ($cacheControl[1] ?? 3600), 86400));
        Cache::put('google.identity.certificates', $certificates, $lifetime);
        return $certificates;
    }
}
