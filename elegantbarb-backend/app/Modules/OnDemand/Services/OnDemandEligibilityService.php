<?php

namespace App\Modules\OnDemand\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\OperationalBlock;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;
use App\Modules\Tracking\Models\LocationUpdate;
use Illuminate\Support\Facades\DB;

class OnDemandEligibilityService
{
    public function eligible(Professional $professional, OnDemandRequest $request, ?float $distance = null): bool
    {
        if (! $professional->is_active || ! $professional->business_id
            || ($request->business_id && (int) $request->business_id !== (int) $professional->business_id)) return false;
        if (DB::table('on_demand.professional_presence')->where('professional_id', $professional->id)->where('is_paused', true)->exists()) return false;
        if (OnDemandRequest::where('professional_id', $professional->id)->whereKeyNot($request->id)
            ->whereIn('status', ['ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS'])->exists()) return false;
        $location = LocationUpdate::where('professional_id', $professional->id)->latest('recorded_at')->first();
        if ($location && $location->recorded_at->lt(now()->subMinutes(5))) return false;
        $service = $request->service;
        if ($request->service_id && (! $service?->is_active || $service->booking_model === 'resource')) return false;
        if ($service && DB::table('catalog.professional_services')->where('service_id', $service->id)->exists()
            && ! $professional->services()->where('catalog.services.id', $service->id)->exists()) return false;
        // Conservative travel allowance, explicitly not a live routing ETA.
        $minutes = max(15, (int) ceil(($distance ?? 10) * 6)) + max(1, (int) ($service?->duration_minutes ?? 60)) + max(0, (int) $service?->buffer_minutes);
        $start = now($professional->business?->timezone ?? 'America/Bogota');
        $end = $start->copy()->addMinutes($minutes);
        if (! $start->isSameDay($end)) return false;
        if ($professional->availability()->exists() && ! $professional->availability()->where('day_of_week', $start->dayOfWeek)
            ->where('is_available', true)->where('start_time', '<=', $start->format('H:i:s'))->where('end_time', '>=', $end->format('H:i:s'))->exists()) return false;
        if (OperationalBlock::where('business_id', $professional->business_id)->where('starts_at', '<', $end)->where('ends_at', '>', $start)
            ->where(fn ($q) => $q->where('professional_id', $professional->id)->orWhere(fn ($all) => $all->whereNull('professional_id')->whereNull('resource_id')))->exists()) return false;
        if (DB::table('platform.google_calendar_busy')->where('professional_id', $professional->id)
            ->where('starts_at', '<', $end)->where('ends_at', '>', $start)->exists()) return false;
        return ! Appointment::where('professional_id', $professional->id)->whereDate('date', $start->toDateString())
            ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->occupyingInventory()
            ->where('start_time', '<', $end->format('H:i:s'))->where('end_time', '>', $start->format('H:i:s'))->exists();
    }
}
