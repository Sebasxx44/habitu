<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\Analytics\Services\MarketplaceTelemetry;
use App\Modules\Analytics\Services\PlatformAnalytics;
use App\Modules\Analytics\Services\ReservationAnalytics;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use Illuminate\Http\Request;

final class AnalyticsController extends Controller
{
    public function businesses(Request $request)
    {
        abort_unless(in_array($request->user()->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true) && $request->user()->hasEffectivePermission('reports.view'), 403);
        return response()->json(app(\App\Modules\Platform\Services\DashboardScope::class)->businesses($request->user())->orderBy('name')->get(['id', 'name']));
    }

    public function business(Request $request, int $businessId)
    {
        $user = $request->user();
        abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true) && $user->hasEffectivePermission('reports.view'), 403);
        $business = Business::findOrFail($businessId);
        abort_unless($user->role === User::ROLE_SUPERADMIN || (int) $business->owner_user_id === $user->id || (int) $user->barber_shop_id === $businessId, 403);
        $period = AnalyticsPeriod::fromRequest($request);
        $services = $business->services()->get();
        $professionalModels = $services->contains(fn ($service) => in_array(\App\Modules\Booking\Services\BookingRules::model($service, $business), ['professional', 'optional_professional'], true) || (\App\Modules\Booking\Services\BookingRules::model($service, $business) === 'resource' && $service->resource_professional_optional));
        $resourceModels = $services->contains(fn ($service) => \App\Modules\Booking\Services\BookingRules::model($service, $business) === 'resource');
        $data = app(ReservationAnalytics::class)->overview(Appointment::where('booking.appointments.business_id', $businessId), $period, $businessId);
        $telemetry = app(MarketplaceTelemetry::class)->overview($period, $businessId);
        $data['metrics'][] = $this->conversion($telemetry);
        return response()->json([
            ...$this->metadata($period), ...$data,
            'scope' => ['type' => 'business', 'id' => $businessId, 'name' => $business->name, 'professionals' => $professionalModels, 'resources' => $resourceModels],
            'telemetry' => $telemetry,
            'platform' => null,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function platform(Request $request)
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        $period = AnalyticsPeriod::fromRequest($request);
        $telemetry = app(MarketplaceTelemetry::class)->overview($period);
        $data = app(ReservationAnalytics::class)->overview(Appointment::query(), $period);
        $data['metrics'][] = $this->conversion($telemetry);
        return response()->json([
            ...$this->metadata($period), ...$data,
            'scope' => ['type' => 'platform', 'id' => null, 'name' => 'HABITU', 'professionals' => true, 'resources' => true],
            'platform' => app(PlatformAnalytics::class)->overview($period),
            'telemetry' => $telemetry,
        ])->header('Cache-Control', 'private, no-store');
    }

    private function conversion(array $telemetry): array
    {
        return ['id' => 'conversion', 'value' => $telemetry['conversion'], 'previous' => null, 'change' => null, 'unit' => 'percent'];
    }

    private function metadata(AnalyticsPeriod $period): array
    {
        return ['period' => $period->toArray(), 'currency' => $period->currency, 'timezone' => config('booking.timezone', 'America/Bogota'),
            'generatedAt' => now()->toIso8601String(), 'limitations' => ['historicalCapacityMissing', 'regionDataMissing', 'consentedMeasurementOnly']];
    }
}
