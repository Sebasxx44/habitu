<?php

declare(strict_types=1);

namespace App\Modules\Business\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Models\BusinessCategory;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class DiscoveryService
{
    private array $availability = [];

    public function __construct(private AvailabilityService $slots) {}

    public function search(array $filters): ServiceResponse
    {
        $this->availability = [];
        $query = $this->query($filters);
        $filterAvailability = ! empty($filters['available']) || ! empty($filters['date']) || ! empty($filters['time_from']) || ! empty($filters['time_to']);
        if ($filterAvailability) {
            // Filter against the same reservation engine before counting/paging, with bounded model batches.
            $ids = [];
            (clone $query)->reorder()->chunkById(80, function ($businesses) use (&$ids, $filters) {
                $this->primeAvailability($businesses->pluck('id')->all(), $filters);
                foreach ($businesses as $business) {
                    $next = $this->nextAvailability($business, $filters);
                    if ($next) { $ids[] = $business->id; $this->availability[$business->id] = $next; }
                }
            }, 'business.businesses.id', 'id');
            $query->whereIn('business.businesses.id', $ids);
        }
        $sort = $filters['sort'] ?? 'recommended';
        match ($sort) {
            'price' => $query->orderByRaw('discovery_price ASC NULLS LAST'),
            'rating' => $query->orderByRaw('real_rating DESC NULLS LAST')->orderByDesc('real_reviews_count'),
            'popular' => $query->orderByDesc('completed_count'),
            'distance' => $query->orderByRaw('distance_km ASC NULLS LAST'),
            'newest' => $query->orderByDesc('business.businesses.created_at'),
            default => $query->orderByDesc('real_reviews_count')->orderByRaw('real_rating DESC NULLS LAST'),
        };
        $query->orderBy('business.businesses.id');
        if (isset($filters['per_page']) || isset($filters['page'])) {
            $page = $query->paginate((int) ($filters['per_page'] ?? 12), ['*'], 'page', (int) ($filters['page'] ?? 1));
            if (! $filterAvailability) $this->primeAvailability($page->getCollection()->pluck('id')->all(), $filters);
            return ServiceResponse::success($page->through(fn ($business) => $this->present($business, $filters)), 'Resultados de búsqueda');
        }
        return ServiceResponse::success($query->limit(100)->get()->map(fn ($business) => $this->present($business, $filters, false)), 'Resultados de búsqueda');
    }

    private function primeAvailability(array $ids, array $filters): void
    {
        $from = CarbonImmutable::parse($filters['date'] ?? 'today', config('booking.timezone'))->startOfDay();
        $to = isset($filters['date_to']) ? CarbonImmutable::parse($filters['date_to'], config('booking.timezone'))
            : (isset($filters['date']) ? $from : $from->addDays(6));
        $this->slots->prime($ids, $from->toDateString(), $to->toDateString());
    }

    private function query(array $filters): Builder
    {
        $query = Business::where('business.businesses.is_active', true)->select('business.businesses.*')
            ->with(['category', 'mainBranch', 'branches' => fn ($q) => $q->where('is_active', true)->whereNull('deleted_at'),
                'promotions' => fn ($q) => $q->activeAndValid()->with('services:id'),
                'services' => fn ($q) => $this->serviceFilters($q->where('is_active', true), $filters)->select('catalog.services.*')->selectSub($this->servicePrice($filters), 'effective_price')->with(['resources' => fn ($r) => $r->where('booking.resources.is_active', true)])])
            ->withAvg(['reviews as real_rating' => fn ($q) => $q->where('is_active', true)], 'rating')
            ->withCount(['reviews as real_reviews_count' => fn ($q) => $q->where('is_active', true), 'appointments as completed_count' => fn ($q) => $q->where('status', 'COMPLETED')])
            ->selectSub($this->serviceFilters(Service::selectRaw('MIN(('.$this->servicePrice($filters)->toSql().'))', $this->servicePrice($filters)->getBindings())->whereColumn('business_id', 'business.businesses.id')->where('is_active', true), $filters), 'discovery_price');
        foreach (preg_split('/\s+/u', trim($filters['q'] ?? ''), 6, PREG_SPLIT_NO_EMPTY) as $term) {
            $like = $this->like($term);
            $query->where(fn ($q) => $q->whereRaw($this->normalized('business.businesses.name').' LIKE ?', [$like])
                ->orWhereRaw($this->normalized('business.businesses.description').' LIKE ?', [$like])
                ->orWhereHas('category', fn ($q) => $q->whereRaw($this->normalized('name').' LIKE ?', [$like]))
                ->orWhereHas('services', fn ($q) => $q->where('is_active', true)->whereRaw($this->normalized('name').' LIKE ?', [$like]))
                ->orWhereHas('professionals', fn ($q) => $q->where('is_active', true)->where(fn ($p) => $p->whereRaw($this->normalized('name').' LIKE ?', [$like])->orWhereRaw($this->normalized('specialty').' LIKE ?', [$like])))
                ->orWhereHas('branches', fn ($q) => $q->where('is_active', true)->whereNull('deleted_at')->whereHas('business', fn ($q) => $q->where('is_active', true))->whereRaw($this->normalized('address').' LIKE ?', [$like])));
        }
        if (! empty($filters['category_id'])) $query->where('business_category_id', $filters['category_id']);
        if (! empty($filters['zone'])) $query->whereHas('branches', fn ($q) => $q->where('is_active', true)->whereNull('deleted_at')->whereHas('business', fn ($q) => $q->where('is_active', true))->whereRaw($this->normalized('address').' LIKE ?', [$this->like($filters['zone'])]));
        $query->whereHas('services', fn ($q) => $this->serviceFilters($q->where('is_active', true), $filters));
        if (isset($filters['min_rating'])) $query->whereRaw('(SELECT AVG(r.rating) FROM reviews.reviews r WHERE r.business_id = business.businesses.id AND r.is_active = TRUE) >= ?', [$filters['min_rating']]);
        if (! empty($filters['promotions'])) $query->whereHas('promotions', fn ($promotions) => $promotions->activeAndValid()
            ->where(fn ($eligible) => $eligible->whereDoesntHave('services')->orWhereHas('services', fn ($services) => $this->serviceFilters($services->where('catalog.services.is_active', true), $filters))));
        if (isset($filters['lat'], $filters['lng'])) {
            $distance = 'SELECT MIN(6371 * acos(least(1, greatest(-1, cos(radians(?)) * cos(radians(b.lat)) * cos(radians(b.lng) - radians(?)) + sin(radians(?)) * sin(radians(b.lat)))))) FROM business.business_branches b WHERE b.business_id = business.businesses.id AND b.is_active = TRUE AND b.deleted_at IS NULL AND b.lat IS NOT NULL AND b.lng IS NOT NULL';
            $bindings = [$filters['lat'], $filters['lng'], $filters['lat']];
            $query->selectRaw('('.$distance.') AS distance_km', $bindings);
            if (isset($filters['radius'])) $query->whereRaw('('.$distance.') <= ?', [...$bindings, $filters['radius']]);
        } else $query->selectRaw('NULL::numeric AS distance_km');
        return $query;
    }

    private function servicePrice(array $filters): \Illuminate\Database\Query\Builder
    {
        $price = 'COALESCE(price_link.price_override, catalog.services.price)';
        if (! empty($filters['duration_minutes'])) $price = 'ROUND(('.$price.') * CASE WHEN catalog.services.duration_mode = \'selectable\' THEN '.(int) $filters['duration_minutes'].'::numeric / NULLIF(catalog.services.duration_minutes, 0) ELSE 1 END, 2)';
        if (! empty($filters['participants'])) $price = '('.$price.') * CASE WHEN catalog.services.booking_model = \'capacity\' THEN '.(int) $filters['participants'].' ELSE 1 END';
        $query = DB::table('business.business_branches as price_branch')
            ->leftJoin('catalog.branch_services as price_link', fn ($join) => $join->on('price_link.branch_id', '=', 'price_branch.id')->whereColumn('price_link.service_id', 'catalog.services.id'))
            ->whereColumn('price_branch.business_id', 'catalog.services.business_id')->where('price_branch.is_active', true)->whereNull('price_branch.deleted_at')
            ->where(fn ($q) => $q->whereNotExists(fn ($links) => $links->selectRaw('1')->from('catalog.branch_services as configured')->whereColumn('configured.service_id', 'catalog.services.id'))->orWhere('price_link.is_active', true))
            ->selectRaw('MIN('.$price.')');
        if (isset($filters['min_price'])) $query->whereRaw($price.' >= ?', [$filters['min_price']]);
        if (isset($filters['max_price'])) $query->whereRaw($price.' <= ?', [$filters['max_price']]);
        if (! empty($filters['zone'])) $query->whereRaw($this->normalized('price_branch.address').' LIKE ?', [$this->like($filters['zone'])]);
        return $query;
    }

    private function serviceFilters(Builder|\Illuminate\Database\Eloquent\Relations\Relation $query, array $filters): Builder|\Illuminate\Database\Eloquent\Relations\Relation
    {
        if (! empty($filters['booking_model'])) $query->where('booking_model', $filters['booking_model']);
        if (! empty($filters['duration_minutes'])) $query->where(fn ($q) => $q
            ->where(fn ($fixed) => $fixed->where('duration_mode', 'fixed')->where('duration_minutes', $filters['duration_minutes']))
            ->orWhere(fn ($selectable) => $selectable->where('duration_mode', 'selectable')->whereJsonContains('duration_options', (int) $filters['duration_minutes'])));
        if (($filters['participants'] ?? 1) > 1) $query->where('booking_model', 'capacity')->where('booking_capacity', '>=', $filters['participants']);
        if (array_intersect(array_keys(array_filter($filters, fn ($value) => $value !== null)), ['resource_id','resource_type','sport_type','surface','covered'])) $query->whereHas('resources', function ($r) use ($filters) {
            $r->where('booking.resources.is_active', true);
            if (! empty($filters['resource_id'])) $r->where('booking.resources.id', $filters['resource_id']);
            if (! empty($filters['resource_type'])) $r->where('booking.resources.type', $filters['resource_type']);
            foreach (['sport_type','surface','covered'] as $key) if (isset($filters[$key])) $r->where('booking.resources.attributes->'.$key, $key === 'covered' ? (bool) $filters[$key] : $filters[$key]);
        });
        if (! empty($filters['service_id'])) $query->where('catalog.services.id', $filters['service_id']);
        $prices = $this->servicePrice($filters);
        $query->whereRaw('('.$prices->toSql().') IS NOT NULL', $prices->getBindings());
        if (! empty($filters['professional_id'])) $query->whereHas('professionals', fn ($q) => $q->where('people.professionals.id', $filters['professional_id'])->where('people.professionals.is_active', true));
        return $query;
    }

    private function present(Business $business, array $filters, bool $withAvailability = true): array
    {
        $data = $business->only(['id', 'name', 'slug', 'description', 'phone', 'email', 'logo_url', 'banner_url', 'business_category_id', 'is_active', 'verified', 'created_at']);
        $data['category'] = $business->category?->only(['id', 'name', 'slug', 'icon', 'color']);
        $branches = $business->branches->map(fn ($branch) => $branch->only(['id', 'business_id', 'name', 'address', 'lat', 'lng', 'phone', 'is_main_branch', 'is_active']));
        $data['branches'] = $branches->all();
        $data['main_branch'] = $branches->firstWhere('is_main_branch', true) ?? $branches->first();
        $data['rating'] = $business->real_rating === null ? null : round((float) $business->real_rating, 1);
        $data['reviews_count'] = (int) $business->real_reviews_count;
        $data['distance_km'] = $business->distance_km === null ? null : round((float) $business->distance_km, 2);
        $data['distance'] = $data['distance_km'];
        $data['price_from'] = $business->discovery_price === null ? null : (float) $business->discovery_price;
        $services = $business->services->map(fn ($service) => ['id' => $service->id, 'name' => $service->name,
            'price' => (float) $service->effective_price, 'duration_minutes' => $service->duration_minutes, 'business_id' => $service->business_id,
            'booking_model' => \App\Modules\Booking\Services\BookingRules::model($service, $business), 'duration_mode' => $service->duration_mode,
            'duration_options' => $service->duration_options ?? [], 'booking_capacity' => $service->booking_capacity,
            'resource_professional_optional' => $service->resource_professional_optional,
            'resources' => $service->resources->map(fn ($resource) => $resource->only(['id','branch_id','name','type','capacity','attributes','image_url']))->all()]);
        $data['services'] = $services->all();
        $data['service_previews'] = $services->take(3)->values()->all();
        $promotion = $business->promotions->sortBy('end_date')
            ->first(fn ($promotion) => $promotion->services->isEmpty() || $promotion->services->pluck('id')->intersect($business->services->pluck('id'))->isNotEmpty());
        $data['active_promotion'] = $promotion?->only(['id', 'title', 'type', 'discount', 'promo_code', 'start_date', 'end_date']);
        $data['next_available'] = $this->availability[$business->id] ?? ($withAvailability ? $this->nextAvailability($business, $filters) : null);
        if ($data['next_available']) $data['branch_id'] = $data['next_available']['branch_id'];
        return $data;
    }

    private function nextAvailability(Business $business, array $filters): ?array
    {
        $day = CarbonImmutable::parse($filters['date'] ?? 'today', config('booking.timezone'))->startOfDay();
        $lastDay = isset($filters['date_to']) ? CarbonImmutable::parse($filters['date_to'], config('booking.timezone'))->startOfDay()
            : (isset($filters['date']) ? $day : $day->addDays(6));
        $business->loadMissing(['branches', 'services']);
        for ($date = $day; $date <= $lastDay; $date = $date->addDay()) {
            $next = null;
            foreach ($business->branches as $branch) foreach ($business->services as $service) {
                if (! empty($filters['zone']) && ! str_contains(\Illuminate\Support\Str::ascii(mb_strtolower($branch->address)), \Illuminate\Support\Str::ascii(mb_strtolower($filters['zone'])))) continue;
                try {
                    $result = $this->slots->slots(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
                        'resource_type' => $filters['resource_type'] ?? null, 'sport_type' => $filters['sport_type'] ?? null, 'surface' => $filters['surface'] ?? null, 'covered' => $filters['covered'] ?? null,
                        'professional_id' => $filters['professional_id'] ?? null, 'resource_id' => $filters['resource_id'] ?? null,
                        'duration_minutes' => $filters['duration_minutes'] ?? null, 'participants' => $filters['participants'] ?? 1, 'date' => $date->toDateString(),
                        'time_from' => $filters['time_from'] ?? null, 'time_to' => $filters['time_to'] ?? null], true);
                    $slot = collect($result['slots'])->firstWhere('available', true);
                    if ($slot && ((isset($filters['min_price']) && $slot['price'] < $filters['min_price']) || (isset($filters['max_price']) && $slot['price'] > $filters['max_price']))) continue;
                    if ($slot && (! $next || $slot['start_time'] < $next['start_time'])) $next = ['date' => $date->toDateString(),
                        'start_time' => $slot['start_time'], 'end_time' => $slot['end_time'], 'professional_id' => $slot['professional_id'],
                        'service_id' => $service->id, 'branch_id' => $branch->id, 'resource_id' => $slot['resource_id'],
                        'resource_name' => $slot['resource_name'], 'booking_model' => $slot['booking_model'], 'duration_minutes' => $slot['duration_minutes'],
                        'participants' => $slot['participants'], 'remaining_capacity' => $slot['remaining_capacity'], 'price' => $slot['price']];
                } catch (ValidationException $exception) { continue; }
            }
            if ($next) return $next;
        }
        return null;
    }

    public function suggestions(string $term): ServiceResponse
    {
        $like = $this->like(trim($term));
        if (mb_strlen(trim($term)) < 2) return ServiceResponse::success([]);
        $items = [];
        foreach ([['business', Business::query()->where('is_active', true), 'name'], ['service', Service::query()->where('is_active', true)->whereHas('business', fn ($q) => $q->where('is_active', true)), 'name'],
            ['category', BusinessCategory::query()->where('is_active', true), 'name'], ['professional', Professional::query()->where('is_active', true)->whereHas('business', fn ($q) => $q->where('is_active', true)), 'name']] as [$type, $query, $field]) {
            foreach ($query->whereRaw($this->normalized($field).' LIKE ?', [$like])->orderBy($field)->limit(4)->get() as $record) {
                $items[] = ['type' => $type, 'id' => $record->id, 'label' => $record->{$field},
                    'business_id' => $type === 'business' ? $record->id : $record->getAttribute('business_id'),
                    'category_id' => $type === 'category' ? $record->id : $record->getAttribute('business_category_id')];
            }
        }
        foreach (BusinessBranch::where('is_active', true)->whereNull('deleted_at')->whereRaw($this->normalized('address').' LIKE ?', [$like])->select('address')->distinct()->orderBy('address')->limit(3)->get() as $branch) {
            $items[] = ['type' => 'zone', 'id' => null, 'label' => $branch->address];
        }
        return ServiceResponse::success(array_slice($items, 0, 15));
    }

    private function normalized(string $column): string
    {
        return "translate(lower($column), 'áéíóúüñ', 'aeiouun')";
    }

    private function like(string $term): string
    {
        return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], strtr(mb_strtolower($term), ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n'])).'%';
    }
}
