<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuditLogMiddleware
{
    /**
     * Actions that should be logged regardless of method.
     */
    protected array $loggableActions = [
        'appointments.cancel',
        'appointments.reschedule',
        'loyalty.stamp',
        'loyalty.redeem',
        'payments.refund',
        'professional-payouts.mark-paid',
    ];

    /**
     * HTTP methods that modify data.
     */
    protected array $mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $routeName = $request->route()?->getName() ?? '';

        // Only log mutating requests or specific actions
        if (! in_array($request->method(), $this->mutatingMethods, true) &&
            ! $this->isLoggableAction($routeName)) {
            return $response;
        }

        $user = $request->user();
        if (! $user) {
            return $response;
        }

        try {
            $this->writeAuditLog($request, $user, $routeName, $response);
        } catch (\Throwable $e) {
            // Fail silently — audit logging should never break the app
            \Log::warning('Audit log failed', [
                'error' => $e->getMessage(),
                'route' => $routeName,
            ]);
        }

        return $response;
    }

    private function isLoggableAction(string $routeName): bool
    {
        foreach ($this->loggableActions as $action) {
            if (str_contains($routeName, $action)) {
                return true;
            }
        }
        return false;
    }

    private function writeAuditLog(Request $request, $user, string $routeName, Response $response): void
    {
        $action = $this->mapMethodToAction($request->method());
        $entityType = $this->extractEntityType($routeName);
        $entityId = $this->extractEntityId($request, $entityType);
        $businessId = $this->extractBusinessId($request);

        $sensitiveFields = ['password', 'password_confirmation', 'token', 'credit_card', 'cvv'];
        $newValues = $request->except($sensitiveFields);

        DB::connection('pgsql')->table('platform.audit_logs')->insert([
            'user_id' => $user->id,
            'user_name' => $user->name,
            'user_role' => $user->role,
            'business_id' => $businessId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'new_values' => ! empty($newValues) ? json_encode($newValues) : null,
            'metadata' => json_encode([
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'endpoint' => $request->path(),
                'method' => $request->method(),
                'route_name' => $routeName,
                'response_status' => $response->getStatusCode(),
            ]),
            'created_at' => now(),
        ]);
    }

    private function mapMethodToAction(string $method): string
    {
        return match ($method) {
            'POST' => 'CREATE',
            'PUT', 'PATCH' => 'UPDATE',
            'DELETE' => 'DELETE',
            default => 'ACTION',
        };
    }

    private function extractEntityType(string $routeName): string
    {
        $parts = explode('.', $routeName);
        return $parts[0] ?? 'unknown';
    }

    private function extractEntityId(Request $request, string $entityType): ?int
    {
        $route = $request->route();
        if (! $route) {
            return null;
        }

        // Try singular form
        $id = $route->parameter($entityType)?->id ?? $route->parameter(Str::singular($entityType))?->id ?? null;
        if ($id) {
            return (int) $id;
        }

        // Try common ID param names
        foreach (['id', 'appointment', 'business', 'professional', 'client', 'service'] as $key) {
            $param = $route->parameter($key);
            if (is_numeric($param)) {
                return (int) $param;
            }
            if (is_object($param) && isset($param->id)) {
                return (int) $param->id;
            }
        }

        return null;
    }

    private function extractBusinessId(Request $request): ?int
    {
        $route = $request->route();
        if (! $route) {
            return null;
        }

        $business = $route->parameter('business');
        if ($business && is_object($business) && isset($business->id)) {
            return (int) $business->id;
        }

        $businessId = $route->parameter('businessId');
        if (is_numeric($businessId)) {
            return (int) $businessId;
        }

        $inputId = $request->input('business_id') ?? $request->input('barber_shop_id');
        if (is_numeric($inputId)) {
            return (int) $inputId;
        }

        return null;
    }
}
