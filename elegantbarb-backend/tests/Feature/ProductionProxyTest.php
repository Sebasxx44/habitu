<?php

namespace Tests\Feature;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

final class ProductionProxyTest extends TestCase
{
    private const SECRET = 'production-proxy-test-shared-secret-64-characters';
    private const INGRESS_CLIENT_IP = '203.0.113.100';

    protected function setUp(): void
    {
        parent::setUp();
        config(['trustedproxy.proxies' => '*', 'trustedproxy.signed_client_ip_secret' => self::SECRET]);
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.10']);
        $this->withHeaders(['X-Forwarded-For' => self::INGRESS_CLIENT_IP, 'X-Forwarded-Proto' => 'https']);
        Route::get('/api/runtime-client-ip', fn (Request $request): JsonResponse => response()->json([
            'ip' => $request->ip(), 'secure' => $request->secure(),
        ]))->middleware('api');
    }

    public function test_valid_signed_ipv4_is_used_without_losing_ingress_https_detection(): void
    {
        $this->withHeaders($this->signedHeaders('198.51.100.20'))->getJson('/api/runtime-client-ip')
            ->assertOk()->assertJsonPath('ip', '198.51.100.20')->assertJsonPath('secure', true);
    }

    public function test_valid_signed_ipv6_is_used_as_the_client_identity(): void
    {
        $this->withHeaders($this->signedHeaders('2001:db8::20'))->getJson('/api/runtime-client-ip')
            ->assertOk()->assertJsonPath('ip', '2001:db8::20');
    }

    public function test_expired_and_future_signed_headers_do_not_change_the_client_identity(): void
    {
        foreach ([time() - 121, time() + 121] as $timestamp) {
            $this->withHeaders($this->signedHeaders('198.51.100.20', $timestamp))->getJson('/api/runtime-client-ip')
                ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
        }
    }

    public function test_invalid_signature_and_modified_ip_cannot_override_the_ingress_client(): void
    {
        $headers = $this->signedHeaders('198.51.100.20');
        $headers['X-Habitu-Proxy-Signature'] = str_repeat('0', 64);
        $this->withHeaders($headers)->getJson('/api/runtime-client-ip')
            ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
        $headers = $this->signedHeaders('198.51.100.20');
        $headers['X-Habitu-Client-IP'] = '198.51.100.21';
        $this->withHeaders($headers)->getJson('/api/runtime-client-ip')
            ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
    }

    public function test_signed_invalid_ip_and_ip_lists_are_rejected(): void
    {
        foreach (['invalid', '198.51.100.20, 198.51.100.21', '999.1.1.1'] as $ip) {
            $this->withHeaders($this->signedHeaders($ip))->getJson('/api/runtime-client-ip')
                ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
        }
    }

    public function test_unconfigured_or_weak_secret_does_not_enable_client_ip_override(): void
    {
        foreach ([null, '', 'weak-secret'] as $secret) {
            config(['trustedproxy.signed_client_ip_secret' => $secret]);
            $this->withHeaders($this->signedHeaders('198.51.100.20'))->getJson('/api/runtime-client-ip')
                ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
        }
    }

    public function test_unsigned_custom_ip_headers_do_not_override_the_ingress_identity(): void
    {
        $this->withHeader('X-Habitu-Client-IP', '198.51.100.20')->getJson('/api/runtime-client-ip')
            ->assertOk()->assertJsonPath('ip', self::INGRESS_CLIENT_IP);
    }

    public function test_one_proxied_clients_login_limit_does_not_block_another_client(): void
    {
        $this->withHeaders($this->signedHeaders('198.51.100.20'));
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', [])->assertUnprocessable();
        }
        $this->postJson('/api/auth/login', [])->assertTooManyRequests();
        $this->withHeaders($this->signedHeaders('198.51.100.21'))->postJson('/api/auth/login', [])
            ->assertUnprocessable();
    }

    public function test_invalid_proxy_signatures_cannot_rotate_the_login_rate_limit_key(): void
    {
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $headers = $this->signedHeaders('198.51.100.'.($attempt + 1));
            $headers['X-Habitu-Proxy-Signature'] = str_repeat('0', 64);
            $response = $this->withHeaders($headers)->postJson('/api/auth/login', []);
            $attempt < 5 ? $response->assertUnprocessable() : $response->assertTooManyRequests();
        }
    }

    private function signedHeaders(string $ip, ?int $timestamp = null): array
    {
        $value = (string) ($timestamp ?? time());
        return ['X-Habitu-Client-IP' => $ip, 'X-Habitu-Proxy-Timestamp' => $value,
            'X-Habitu-Proxy-Signature' => hash_hmac('sha256', $value."\n".$ip, self::SECRET)];
    }
}
