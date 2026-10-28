<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class RateLimitServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        $this->configureApiRateLimiting();
        $this->configureUploadRateLimiting();
    }

    /**
     * Configure API route rate limiting.
     */
    private function configureApiRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $user = $request->user();
            $role = $user?->role ?? 'guest';

            $maxAttempts = match ($role) {
                'SUPERADMIN' => 300,
                'ADMIN_BARBERIA' => 120,
                'PROFESSIONAL' => 100,
                'CLIENTE' => 60,
                default => 30,
            };

            return Limit::perMinute($maxAttempts)
                ->by($this->resolveKey($request, 'api'));
        });
    }

    /**
     * Configure upload route rate limiting.
     */
    private function configureUploadRateLimiting(): void
    {
        RateLimiter::for('upload', function (Request $request) {
            $user = $request->user();
            $role = $user?->role ?? 'guest';

            $maxAttempts = match ($role) {
                'SUPERADMIN' => 100,
                'ADMIN_BARBERIA' => 60,
                'PROFESSIONAL' => 40,
                'CLIENTE' => 20,
                default => 10,
            };

            return Limit::perMinute($maxAttempts)
                ->by($this->resolveKey($request, 'upload'));
        });
    }

    /**
     * Resolve the rate limiter key.
     */
    private function resolveKey(Request $request, string $prefix): string
    {
        $userId = $request->user()?->id ?? 'guest';
        $ip = $request->ip();

        return "{$prefix}:{$userId}:{$ip}";
    }
}
