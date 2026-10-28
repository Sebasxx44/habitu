<?php

namespace App\Http\Middleware;

use App\Core\DTOs\ServiceResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiKey
{
    /**
     * Handle an incoming request.
     *
     * Validates the X-API-Key header for external widget access.
     * Set the `X-API-Key` header to enable optional validation.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');

        // If no API key is provided, allow the request (optional validation)
        if (empty($apiKey)) {
            return $next($request);
        }

        $validKey = $this->isValidApiKey($apiKey);

        if (! $validKey) {
            return ServiceResponse::error(
                'Invalid or inactive API key.',
                'Unauthorized',
                401
            )->toJsonResponse();
        }

        return $next($request);
    }

    /**
     * Check if the provided API key exists and is active.
     */
    private function isValidApiKey(string $apiKey): bool
    {
        try {
            return DB::table('api_keys')
                ->where('key', $apiKey)
                ->where('active', true)
                ->where(function ($query) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                })
                ->exists();
        } catch (\Exception $e) {
            // If table doesn't exist, deny
            return false;
        }
    }
}
