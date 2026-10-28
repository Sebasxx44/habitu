<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class TrustSignedProxyClientIp
{
    private const MAX_CLOCK_SKEW_SECONDS = 120;

    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('trustedproxy.signed_client_ip_secret');
        $ip = $request->header('X-Habitu-Client-IP');
        $timestamp = $request->header('X-Habitu-Proxy-Timestamp');
        $signature = $request->header('X-Habitu-Proxy-Signature');

        if (is_string($secret) && strlen($secret) >= 32
            && is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP)
            && is_string($timestamp) && preg_match('/^\d{10,11}$/D', $timestamp)
            && abs(time() - (int) $timestamp) <= self::MAX_CLOCK_SKEW_SECONDS
            && is_string($signature) && preg_match('/^[a-f0-9]{64}$/D', $signature)
            && hash_equals(hash_hmac('sha256', $timestamp."\n".$ip, $secret), $signature)) {
            // Keep the ingress proxy and HTTPS handling intact; replace only its authenticated client IP.
            $request->headers->set('X-Forwarded-For', $ip);
        }

        return $next($request);
    }
}
