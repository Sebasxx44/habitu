<?php

namespace App\Http\Middleware;

use App\Core\DTOs\ServiceResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitByRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $role = $user?->role ?? 'guest';
        $maxAttempts = $this->getMaxAttempts($role);
        $key = $this->resolveRequestSignature($request, $role);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($key);

            return ServiceResponse::error(
                'Too many requests. Please try again later.',
                "Rate limit exceeded. Retry after {$retryAfter} seconds.",
                429
            )->toJsonResponse()->withHeaders([
                'X-RateLimit-Limit' => $maxAttempts,
                'X-RateLimit-Remaining' => 0,
                'Retry-After' => $retryAfter,
            ]);
        }

        RateLimiter::hit($key, 60);

        $response = $next($request);

        $remaining = $maxAttempts - RateLimiter::attempts($key);
        $response->headers->set('X-RateLimit-Limit', (string) $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', (string) max(0, $remaining));

        return $response;
    }

    /**
     * Get the maximum number of attempts per minute based on role.
     */
    private function getMaxAttempts(string $role): int
    {
        return match ($role) {
            'SUPERADMIN' => 300,
            'ADMIN_BARBERIA' => 120,
            'PROFESSIONAL' => 100,
            'CLIENTE' => 60,
            default => 30,
        };
    }

    /**
     * Resolve the request signature for the rate limiter.
     */
    private function resolveRequestSignature(Request $request, string $role): string
    {
        $userId = $request->user()?->id ?? 'guest';
        $route = $request->route()?->getName() ?? $request->path();

        return sha1("rate-limit:{$role}:{$userId}:{$route}:" . $request->ip());
    }
}
