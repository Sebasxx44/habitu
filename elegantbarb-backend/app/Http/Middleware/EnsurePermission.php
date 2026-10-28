<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission  Permission slug (e.g., "business.view", "booking.appointments.create")
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthenticated',
            ], 401);
        }

        // SUPERADMIN bypass
        if ($user->role === 'SUPERADMIN') {
            return $next($request);
        }

        $hasPermission = $user->hasEffectivePermission($permission);

        if (! $hasPermission) {
            return response()->json([
                'success' => false,
                'error' => 'Forbidden: ' . $permission,
            ], 403);
        }

        // If permission requires business context, verify access
        $businessId = $this->extractBusinessId($request);
        if ($businessId && ! $this->canAccessBusiness($user, $businessId)) {
            return response()->json([
                'success' => false,
                'error' => 'Forbidden: business access denied',
            ], 403);
        }

        return $next($request);
    }

    private function extractBusinessId(Request $request): ?int
    {
        // Check route parameters
        $business = $request->route('business');
        if ($business && is_object($business)) {
            return $business->id ?? null;
        }

        $businessId = $request->route('businessId');
        if ($businessId) {
            return (int) $businessId;
        }

        // Check input
        $inputId = $request->input('business_id') ?? $request->input('barber_shop_id');
        if ($inputId) {
            return (int) $inputId;
        }

        return null;
    }

    private function canAccessBusiness($user, int $businessId): bool
    {
        // Business admin can only access their own businesses
        if ($user->role === 'ADMIN_BARBERIA') {
            return $user->barber_shop_id === $businessId;
        }

        // Professional can access their business
        if ($user->role === 'PROFESSIONAL') {
            $professional = \App\Modules\People\Models\Professional::find($user->barber_id);
            return $professional && $professional->business_id === $businessId;
        }

        // Client can access any business (for booking)
        if ($user->role === 'CLIENTE') {
            return true;
        }

        return false;
    }
}
