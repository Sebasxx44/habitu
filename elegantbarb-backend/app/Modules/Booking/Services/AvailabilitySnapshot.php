<?php

declare(strict_types=1);

namespace App\Modules\Booking\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** A read-only request snapshot; reservation writes always reload rows under locks. */
final class AvailabilitySnapshot
{
    public Collection $businesses;
    public Collection $branches;
    public Collection $services;
    public Collection $professionals;
    public Collection $resources;
    public Collection $resourceServices;
    public Collection $branchServices;
    public Collection $professionalServices;
    public Collection $branchSchedules;
    public Collection $professionalSchedules;
    public Collection $appointments;
    public Collection $operationalBlocks;
    public Collection $calendarBusy;

    /** @param list<int> $businessIds */
    public function __construct(array $businessIds, string $from, string $to)
    {
        $this->businesses = Business::whereIn('id', $businessIds)->where('is_active', true)->get()->keyBy('id');
        $this->branches = BusinessBranch::whereIn('business_id', $businessIds)->where('is_active', true)->whereNull('deleted_at')->get()->keyBy('id');
        $this->services = Service::whereIn('business_id', $businessIds)->where('is_active', true)->get()->keyBy('id');
        $this->professionals = Professional::whereIn('business_id', $businessIds)->where('is_active', true)->orderBy('id')->get()->keyBy('id');
        $this->resources = Resource::whereIn('business_id', $businessIds)->where('is_active', true)->orderBy('id')->get()->keyBy('id');
        $this->resourceServices = DB::table('catalog.resource_services')->whereIn('service_id', $this->services->keys())->get()->groupBy('service_id');
        $this->branchServices = DB::table('catalog.branch_services')->whereIn('service_id', $this->services->keys())->get()->groupBy('service_id');
        $this->professionalServices = DB::table('catalog.professional_services')->whereIn('service_id', $this->services->keys())->get()->groupBy('service_id');
        $this->branchSchedules = DB::table('business.branch_schedules')->whereIn('branch_id', $this->branches->keys())->get()->groupBy('branch_id');
        $this->professionalSchedules = DB::table('people.professional_availability')->whereIn('professional_id', $this->professionals->keys())->get()->groupBy('professional_id');
        $this->calendarBusy = DB::table('platform.google_calendar_busy')->whereIn('professional_id', $this->professionals->keys())
            ->where('starts_at', '<', \Carbon\CarbonImmutable::parse($to, config('booking.timezone'))->addDay()->utc())
            ->where('ends_at', '>', \Carbon\CarbonImmutable::parse($from, config('booking.timezone'))->utc())->get();
        $this->operationalBlocks = \App\Modules\Booking\Models\OperationalBlock::whereIn('business_id', $businessIds)
            ->where('starts_at', '<', \Carbon\CarbonImmutable::parse($to, config('booking.timezone'))->addDay()->utc())
            ->where('ends_at', '>', \Carbon\CarbonImmutable::parse($from, config('booking.timezone'))->utc())->get();
        $this->appointments = Appointment::whereIn('business_id', $businessIds)->whereBetween('date', [$from, $to])
            ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])->occupyingInventory()
            ->get(['id', 'client_id', 'professional_id', 'resource_id', 'date', 'start_time', 'end_time', 'service_id', 'branch_id', 'participants'])
            ->groupBy(fn ($appointment) => $appointment->date->toDateString());
    }
}
