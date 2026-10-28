<?php

namespace App\Modules\Business\Services;

use App\Core\Contracts\ServiceInterface;
use App\Core\DTOs\ServiceResponse;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Repositories\BusinessRepository;
use App\Modules\Booking\Services\BookingRules;
use App\Modules\People\DTOs\ProfessionalProfile;
use App\Modules\People\Models\Professional;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BusinessService implements ServiceInterface
{
    public function __construct(
        private BusinessRepository $repository
    ) {}

    public function all(array $filters = []): ServiceResponse
    {
        $query = $this->repository->with(['category', 'mainBranch', 'branches']);

        if (! empty($filters['category_id'])) {
            $query->where(['business_category_id' => $filters['category_id']]);
        }

        if (array_key_exists('active', $filters)) {
            $active = filter_var($filters['active'], FILTER_VALIDATE_BOOLEAN);
            $query->addCriteria(fn ($q) => $q->where('is_active', $active));
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->addCriteria(fn ($q) => $q->where(function ($sub) use ($search) {
                $sub->where('business.businesses.name', 'ilike', "%{$search}%")
                    ->orWhere('business.businesses.description', 'ilike', "%{$search}%")
                    ->orWhereExists(function ($subQuery) use ($search) {
                        $subQuery->select(\DB::raw(1))
                            ->from('business.business_branches')
                            ->whereColumn('business.business_branches.business_id', 'business.businesses.id')
                            ->where('business.business_branches.address', 'ilike', "%{$search}%");
                    });
            }));
        }

        $businesses = $query->all();

        return ServiceResponse::success($businesses, 'Negocios obtenidos');
    }

    public function find(int $id): ServiceResponse
    {
        $business = $this->repository->with([
            'category',
            'branches.schedules',
            'socialLinks',
            'professionals' => fn ($q) => $q->active()->select(\App\Modules\People\DTOs\ProfessionalProfile::PUBLIC_FIELDS),
            'services' => fn ($q) => $q->active()->with(['resources' => fn ($q) => $q->where('booking.resources.is_active', true), 'professionals' => fn ($q) => $q->where('people.professionals.is_active', true)->select(array_map(fn ($field) => 'people.professionals.'.$field, \App\Modules\People\DTOs\ProfessionalProfile::PUBLIC_FIELDS))]),
            'promotions' => fn ($q) => $q->activeAndValid()->with('services:id'),
            'resources' => fn ($q) => $q->where('is_active', true),
            'reviews' => fn ($q) => $q->where('is_active', true)->latest()->limit(20),
        ])->find($id);

        if (! $business) {
            return ServiceResponse::notFound('Negocio');
        }

        $business = app(BusinessSettingsService::class)->present($business);
        foreach ($business->branches as $branch) {
            $branch->setRelation('schedules', $branch->schedules->map(fn ($schedule) => array_merge(
                $schedule->only(['id', 'branch_id', 'day', 'is_closed']),
                ['open_time' => $schedule->open_time?->format('H:i'), 'close_time' => $schedule->close_time?->format('H:i')]
            )));
        }
        // Any explicit link, including a disabled one, disables the legacy all-professionals fallback.
        $configuredServiceIds = DB::table('catalog.professional_services')->whereIn('service_id', $business->services->modelKeys())
            ->pluck('service_id')->map(fn ($serviceId): int => (int) $serviceId)->unique()->all();
        $legacyProfiles = null;
        foreach ($business->services as $service) {
            $model = BookingRules::model($service, $business);
            $profiles = $service->professionals->groupBy('id')->map(fn ($linked) => array_merge(
                $linked->first()->only(ProfessionalProfile::PUBLIC_FIELDS),
                ['branch_ids' => $linked->map(fn ($profile): int => (int) $profile->pivot->branch_id)->unique()->values()->all()]
            ))->values();
            $allowsProfessional = in_array($model, ['professional', 'optional_professional'], true)
                || ($model === 'resource' && $service->resource_professional_optional);
            if ($allowsProfessional && ! in_array($service->id, $configuredServiceIds, true)) {
                $legacyProfiles ??= $this->legacyProfessionals($business);
                $profiles = $legacyProfiles;
            }
            $service->setRelation('professionals', $profiles);
            $service->setAttribute('currency', 'COP');
            $service->setAttribute('booking_model', $model);
        }
        return ServiceResponse::success($business, 'Negocio encontrado');
    }

    private function legacyProfessionals(Business $business): Collection
    {
        $business->loadMissing('professionals.availability');
        $branchIds = $business->branches->filter(fn ($branch): bool => $branch->is_active && $branch->deleted_at === null)
            ->map(fn ($branch): int => (int) $branch->id)->all();
        return $business->professionals->map(fn (Professional $professional): array => [
            ...$professional->only(ProfessionalProfile::PUBLIC_FIELDS),
            'branch_ids' => $professional->availability->isEmpty() ? $branchIds : $professional->availability
                ->where('is_available', true)->pluck('branch_id')->map(fn ($branchId): int => (int) $branchId)
                ->intersect($branchIds)->unique()->values()->all(),
        ])->filter(fn (array $profile): bool => $profile['branch_ids'] !== [])->values();
    }

    public function assertBookable(int $businessId, ?Business $business = null): void
    {
        $business ??= Business::find($businessId);
        if ($business?->booking_mode === 'external') {
            throw ValidationException::withMessages(['business_id' => 'Este negocio recibe solicitudes en su canal oficial externo. Consulta el enlace publicado; HABITÜ no administra su agenda.']);
        }
    }

    private function listingMetadata(array $data, ?Business $existing = null): array
    {
        $mode = $data['booking_mode'] ?? $existing?->booking_mode ?? 'internal';
        if ($existing && $mode !== $existing->booking_mode) {
            throw ValidationException::withMessages(['booking_mode' => 'Cambiar el canal requiere verificar primero la autorización del comerciante.']);
        }
        foreach (['booking_url', 'listing_source_url'] as $field) {
            $value = array_key_exists($field, $data) ? $data[$field] : $existing?->getAttribute($field);
            if ($value !== null && (! is_string($value) || ! $this->publicHttpsUrl($value))) {
                throw ValidationException::withMessages([$field => 'Usa un enlace HTTPS oficial sin credenciales.']);
            }
            if ($mode === 'external' && ($data['is_active'] ?? $existing?->is_active ?? true) && ! $value) {
                throw ValidationException::withMessages([$field => 'La ficha necesita un enlace oficial y su fuente antes de publicarse.']);
            }
        }
        if ($mode === 'external') {
            foreach (['services', 'professionals', 'resources', 'schedule', 'opening_hours'] as $field) {
                if (! empty($data[$field])) throw ValidationException::withMessages([$field => 'Una ficha externa no crea personal, servicios ni horarios operativos en HABITÜ.']);
            }
            if (! $existing) $data['owner_user_id'] = null;
            $data['uses_professionals'] = false;
            $data['uses_resources'] = false;
        }
        $data['booking_mode'] = $mode;
        return $data;
    }

    private function publicHttpsUrl(string $value): bool
    {
        $url = parse_url($value);
        return filter_var($value, FILTER_VALIDATE_URL) !== false && is_array($url)
            && strtolower($url['scheme'] ?? '') === 'https' && ! empty($url['host'])
            && ! isset($url['user']) && ! isset($url['pass'])
            && (! isset($url['port']) || $url['port'] === 443);
    }

    public function create(array $data): ServiceResponse
    {
        return \DB::transaction(fn () => $this->createBusiness($data));
    }

    private function createBusiness(array $data): ServiceResponse
    {
        $data = $this->listingMetadata($data);
        $data['slug'] = $data['slug'] ?? \Illuminate\Support\Str::slug($data['name']) . '-' . time();
        $data['rating'] = 0;
        $data['reviews_count'] = 0;
        $data['verified'] = false;

        $business = $this->repository->create($data);

        // Crear sucursal principal automáticamente
        $branch = null;
        if (empty($data['branches'])) {
            $branch = $business->branches()->create([
                'name' => 'Sede Principal',
                'address' => $data['address'] ?? '',
                'is_main_branch' => true,
                'is_active' => true,
            ]);
        }

        // Crear servicios
        if (! empty($data['services'])) {
            foreach ($data['services'] as $svc) {
                $business->services()->create([
                    'name' => $svc['name'],
                    'description' => $svc['description'] ?? 'Servicio de ' . $svc['name'],
                    'price' => $svc['price'] ?? 0,
                    'duration_minutes' => $svc['duration'] ?? 30,
                    'requires_professional' => $data['uses_professionals'] ?? true,
                    'is_active' => true,
                ]);
            }
        }

        // Crear profesionales
        if (! empty($data['professionals'])) {
            foreach ($data['professionals'] as $prof) {
                $business->professionals()->create([
                    'name' => $prof['name'],
                    'specialty' => $prof['specialty'] ?? null,
                    'bio' => 'Especialista en ' . ($prof['specialty'] ?? 'servicios'),
                    'is_active' => true,
                ]);

                // Without an explicit professional schedule, availability inherits the branch hours.

            }
        }

        // Crear recursos
        if (! empty($data['resources'])) {
            foreach ($data['resources'] as $res) {
                $business->resources()->create([
                    'branch_id' => $branch?->id,
                    'name' => $res['name'],
                    'type' => $res['type'] ?? 'ROOM',
                    'description' => $res['description'] ?? null,
                    'capacity' => 1,
                    'is_active' => true,
                ]);
            }
        }

        // Crear horarios de sucursal
        if (! empty($data['schedule']) && $branch) {
            $dayMap = [
                'sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3,
                'thursday' => 4, 'friday' => 5, 'saturday' => 6,
            ];
            foreach ($data['schedule'] as $dayName => $hours) {
                $dayIndex = $dayMap[$dayName] ?? 1;
                \DB::table('business.branch_schedules')->insert([
                    'branch_id' => $branch->id,
                    'day' => $dayIndex,
                    'open_time' => $hours['open'] ?? '09:00:00',
                    'close_time' => $hours['close'] ?? '19:00:00',
                    'is_closed' => $hours['closed'] ?? false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return ServiceResponse::success($business->fresh(['branches', 'services', 'professionals', 'resources']), 'Negocio creado exitosamente', 201);
    }

    public function update(int $id, array $data): ServiceResponse
    {
        $business = $this->repository->find($id);
        if (! $business) {
            return ServiceResponse::notFound('Negocio');
        }

        $data = $this->listingMetadata($data, $business);
        \DB::transaction(function () use ($business, $id, $data) {
            $business->newQuery()->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->repository->update($id, $data);
            app(BusinessSettingsService::class)->update($business, $data);
        });

        return $this->find($id);
    }

    public function delete(int $id): ServiceResponse
    {
        $business = $this->repository->find($id);
        if (! $business) {
            return ServiceResponse::notFound('Negocio');
        }

        $this->repository->delete($id);

        return ServiceResponse::success(null, 'Negocio eliminado');
    }

    public function search(string $query, ?int $categoryId = null, ?float $lat = null, ?float $lng = null, ?float $radius = null): ServiceResponse
    {
        return app(DiscoveryService::class)->search(array_filter(['q' => $query, 'category_id' => $categoryId, 'lat' => $lat, 'lng' => $lng, 'radius' => $radius], fn ($value) => $value !== null));
    }
}
