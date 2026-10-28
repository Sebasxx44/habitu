<?php

namespace App\Modules\Analytics\Services;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Professional;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class PlatformAnalytics
{
    public function overview(AnalyticsPeriod $period): array
    {
        $start = $period->start->utc(); $end = $period->end->endOfDay()->utc();
        $previousStart = $period->previousStart->utc(); $previousEnd = $period->previousEnd->endOfDay()->utc();
        $appointments = Appointment::whereBetween('date', [$period->start->toDateString(), $period->end->toDateString()]);
        $metric = fn (string $id, int|float|null $value, int|float|null $previous = null, string $unit = 'count') => ['id' => $id, 'value' => $value, 'previous' => $previous, 'unit' => $unit, 'change' => $previous > 0 ? round(($value - $previous) / $previous * 100, 1) : null];
        $clients = (clone $appointments)->where('status', '<>', 'CANCELLED')->select('client_id');
        $activeUsers = DB::table('people.clients')->whereIn('id', $clients)->whereNotNull('user_id')->distinct()->count('user_id');
        $businesses = Business::query();
        $geographyAvailable = Schema::hasTable('public.cities') && Schema::hasTable('public.countries');
        $branches = DB::table('business.business_branches')->whereIn('id', (clone $appointments)->select('branch_id'));
        return [
            'metrics' => [
                $metric('totalUsers', User::count()), $metric('activeUsers', $activeUsers),
                $metric('newUsers', User::whereBetween('created_at', [$start, $end])->count(), User::whereBetween('created_at', [$previousStart, $previousEnd])->count()),
                $metric('totalBusinesses', (clone $businesses)->count()), $metric('activeBusinesses', (clone $businesses)->where('is_active', true)->count()),
                $metric('newBusinesses', (clone $businesses)->whereBetween('created_at', [$start, $end])->count(), (clone $businesses)->whereBetween('created_at', [$previousStart, $previousEnd])->count()),
                $metric('publishedServices', Service::where('is_active', true)->count()), $metric('activeProfessionals', Professional::where('is_active', true)->count()),
                $metric('activeResources', Resource::where('is_active', true)->count()),
                $metric('activeCities', $geographyAvailable ? (clone $branches)->whereNotNull('city_id')->distinct()->count('city_id') : null),
                $metric('activeCountries', $geographyAvailable ? DB::table('public.cities')->whereIn('id', (clone $branches)->select('city_id'))->distinct()->count('country_id') : null),
                $metric('reservedValue', (float) (clone $appointments)->where('currency', $period->currency)->whereNotIn('status', ['CANCELLED', 'NO_SHOW'])->sum('final_price'), null, 'currency'),
            ],
            'growth' => $this->growth($period), 'geography' => $this->geography($period), 'categories' => $this->categories($period),
            'demographics' => ['available' => false, 'reason' => 'demographicConsentMissing'],
        ];
    }

    private function growth(AnalyticsPeriod $period): array
    {
        $timezone = config('booking.timezone', 'America/Bogota');
        $load = fn ($model, $start, $end) => $model->whereBetween('created_at', [$start->utc(), $end->endOfDay()->utc()])
            ->selectRaw("DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE ?) AS day, COUNT(*) AS count", [$timezone])->groupBy('day')->pluck('count', 'day');
        $users = $load(User::query(), $period->start, $period->end);
        $oldUsers = $load(User::query(), $period->previousStart, $period->previousEnd);
        $businesses = $load(Business::query(), $period->start, $period->end);
        $oldBusinesses = $load(Business::query(), $period->previousStart, $period->previousEnd);
        $rows = [];
        foreach (range(0, $period->days - 1) as $offset) {
            $day = $period->start->addDays($offset); $date = $day->toDateString(); $previous = $period->previousStart->addDays($offset)->toDateString();
            $bucket = $period->bucket($day);
            $rows[$bucket] ??= ['date' => $bucket, 'users' => 0, 'previousUsers' => 0, 'businesses' => 0, 'previousBusinesses' => 0];
            $rows[$bucket]['users'] += (int) ($users[$date] ?? 0); $rows[$bucket]['previousUsers'] += (int) ($oldUsers[$previous] ?? 0);
            $rows[$bucket]['businesses'] += (int) ($businesses[$date] ?? 0); $rows[$bucket]['previousBusinesses'] += (int) ($oldBusinesses[$previous] ?? 0);
        }
        return array_values($rows);
    }

    private function geography(AnalyticsPeriod $period): array
    {
        if (! Schema::hasTable('public.cities') || ! Schema::hasTable('public.countries')) return ['minimumGroup' => (int) config('analytics.minimum_group', 5), 'countries' => [], 'cities' => [], 'precision' => 'unavailable'];
        $base = DB::table('booking.appointments as a')->join('people.clients as client', 'client.id', '=', 'a.client_id')
            ->join('business.business_branches as branch', 'branch.id', '=', 'a.branch_id')->join('public.cities as city', 'city.id', '=', 'branch.city_id')->join('public.countries as country', 'country.id', '=', 'city.country_id')
            ->whereNull('a.deleted_at')->whereBetween('a.date', [$period->start->toDateString(), $period->end->toDateString()]);
        $identity = "COALESCE('u:' || client.user_id::text, 'c:' || client.id::text)";
        $minimum = (int) config('analytics.minimum_group', 5);
        $countries = (clone $base)->selectRaw("country.id, country.name, COUNT(*) AS reservations, COUNT(DISTINCT {$identity}) AS clients, COUNT(DISTINCT a.business_id) AS businesses")
            ->groupBy('country.id', 'country.name')->havingRaw("COUNT(DISTINCT {$identity}) >= ?", [$minimum])->orderByDesc('reservations')->get();
        $cities = (clone $base)->selectRaw("city.id, city.name, country.id AS country_id, COUNT(*) AS reservations, COUNT(DISTINCT {$identity}) AS clients, COUNT(DISTINCT a.business_id) AS businesses")
            ->groupBy('city.id', 'city.name', 'country.id')->havingRaw("COUNT(DISTINCT {$identity}) >= ?", [$minimum])->orderByDesc('reservations')->get();
        $present = fn ($row) => ['id' => (int) $row->id, 'name' => $row->name, 'reservations' => (int) $row->reservations, 'clients' => (int) $row->clients, 'businesses' => (int) $row->businesses];
        return ['minimumGroup' => $minimum, 'countries' => $countries->map($present)->all(), 'cities' => $cities->map(fn ($row) => [...$present($row), 'countryId' => (int) $row->country_id])->all(), 'precision' => 'businessCity'];
    }

    private function categories(AnalyticsPeriod $period): array
    {
        $load = fn ($start, $end) => DB::table('booking.appointments as a')->join('business.businesses as b', 'b.id', '=', 'a.business_id')
            ->whereNull('a.deleted_at')->whereNull('b.deleted_at')->whereBetween('a.date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('b.business_category_id AS category_id, COUNT(*) AS reservations')->groupBy('b.business_category_id')->pluck('reservations', 'category_id');
        $current = $load($period->start, $period->end); $previous = $load($period->previousStart, $period->previousEnd);
        $names = DB::table('platform.business_categories')->whereIn('id', $current->keys()->merge($previous->keys())->unique())->pluck('name', 'id');
        return $names->map(fn ($name, $id) => ['id' => (int) $id, 'name' => $name, 'reservations' => (int) ($current[$id] ?? 0), 'previous' => (int) ($previous[$id] ?? 0), 'change' => ($previous[$id] ?? 0) > 0 ? round((($current[$id] ?? 0) - $previous[$id]) / $previous[$id] * 100, 1) : null])->sortByDesc('reservations')->values()->all();
    }
}
