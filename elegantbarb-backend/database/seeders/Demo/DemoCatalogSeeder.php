<?php

namespace Database\Seeders\Demo;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\BranchSchedule;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Catalog\Models\ServiceCategory;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\ProfessionalAvailability;
use App\Modules\People\Models\ProfessionalPortfolio;
use App\Modules\Platform\Models\BusinessCategory;
use App\Modules\Reviews\Models\Review;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoCatalogSeeder extends Seeder
{
    private array $roles = [];
    private string $passwordHash;
    private CarbonImmutable $today;

    public function run(): void
    {
        $this->passwordHash = Hash::make(DemoData::PASSWORD);
        $this->today = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'))->startOfDay();
        Model::withoutEvents(fn () => DB::transaction(function () {
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['elegantbarb.demo.catalog']);
            $this->seedRoles();
            $this->user(DemoData::SUPERADMIN_EMAIL, 'Sofía · Superadmin demo', User::ROLE_SUPERADMIN);
            foreach ($this->businessDefinitions() as $index => $definition) $this->seedBusiness($index + 1, $definition);
        }));
    }

    private function seedRoles(): void
    {
        $groups = [
            'barbershops' => ['view', 'create', 'edit', 'delete'],
            'barbers' => ['view', 'create', 'edit', 'delete'],
            'clients' => ['view', 'create', 'edit', 'delete'],
            'appointments' => ['view', 'create', 'edit', 'cancel'],
            'services' => ['view', 'manage'], 'users' => ['view', 'create', 'edit', 'delete'],
            'roles' => ['view', 'manage'], 'reports' => ['view', 'export'], 'settings' => ['profile', 'manage'],
        ];
        $permissions = [];
        foreach ($groups as $group => $actions) {
            foreach ($actions as $action) {
                $slug = "$group.$action";
                $permissions[$slug] = Permission::firstOrCreate(['slug' => $slug], [
                    'name' => $slug, 'group' => $group, 'description' => 'Permiso funcional de '.$group,
                ])->id;
            }
        }
        $roleDefinitions = [
            User::ROLE_SUPERADMIN => ['superadmin', 'Superadministración demo', array_keys($permissions)],
            User::ROLE_ADMIN => ['admin', 'Administración demo', array_values(array_filter(array_keys($permissions), fn ($slug) => ! str_starts_with($slug, 'users.') && ! str_starts_with($slug, 'roles.')))],
            User::ROLE_PROFESSIONAL => ['professional', 'Profesional demo', ['appointments.view', 'appointments.edit', 'appointments.cancel', 'services.view', 'barbers.view', 'settings.profile']],
            User::ROLE_CLIENT => ['client', 'Cliente demo', ['appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel', 'services.view', 'settings.profile']],
        ];
        foreach ($roleDefinitions as $systemRole => [$suffix, $name, $slugs]) {
            $role = Role::firstOrCreate(['slug' => 'demo-'.$suffix], [
                'name' => $name, 'type' => 'custom', 'description' => 'Rol exclusivo de las cuentas de demostración ElegantBarb.',
            ]);
            $role->permissions()->syncWithoutDetaching(array_map(fn ($slug) => $permissions[$slug], $slugs));
            $this->roles[$systemRole] = $role;
        }
    }

    private function user(string $email, string $name, string $role): User
    {
        $user = User::updateOrCreate(['email' => $email], [
            'name' => $name, 'role' => $role, 'password' => $this->passwordHash,
        ]);
        $user->roles()->syncWithoutDetaching([$this->roles[$role]->id]);
        return $user;
    }

    private function seedBusiness(int $number, array $definition): void
    {
        $owner = $this->user($definition['admin_email'], $definition['admin_name'], User::ROLE_ADMIN);
        $category = BusinessCategory::firstOrCreate(['slug' => $definition['category_slug']], [
            'name' => $definition['category_name'], 'icon' => $definition['icon'], 'color' => $definition['color'],
            'description' => 'Categoría de demostración.', 'sort_order' => 90 + $number, 'is_active' => true,
        ]);
        $business = Business::withTrashed()->updateOrCreate(['slug' => $definition['slug']], [
            'owner_user_id' => $owner->id, 'business_category_id' => $category->id,
            'name' => $definition['name'], 'description' => $definition['description'],
            'email' => $definition['admin_email'], 'phone' => '+57 300 000 00'.sprintf('%02d', $number),
            'primary_color' => $definition['color'], 'secondary_color' => '#102A2A', 'accent_color' => '#D8A85E',
            'verified' => true, 'is_active' => true, 'uses_professionals' => true, 'uses_resources' => true,
        ]);
        $business->forceFill(['deleted_at' => null])->save();
        $owner->update(['barber_shop_id' => $business->id]);
        $branch = BusinessBranch::updateOrCreate(['business_id' => $business->id, 'name' => 'Sede Principal Demo'], [
            'address' => $definition['address'], 'lat' => $definition['lat'], 'lng' => $definition['lng'],
            'phone' => $business->phone, 'email' => $business->email, 'is_main_branch' => true, 'is_active' => true,
        ]);
        $branch->forceFill(['deleted_at' => null])->save();
        foreach (range(0, 6) as $day) BranchSchedule::updateOrCreate(['branch_id' => $branch->id, 'day' => $day], [
            'open_time' => '08:00', 'close_time' => '20:00', 'is_closed' => false,
        ]);
        $serviceCategory = ServiceCategory::firstOrCreate(['business_id' => $business->id, 'name' => 'Experiencias demo']);
        $services = [];
        foreach ($definition['services'] as [$name, $price, $duration]) {
            $service = Service::withTrashed()->updateOrCreate(['business_id' => $business->id, 'name' => $name], [
                'service_category_id' => $serviceCategory->id, 'description' => 'Servicio de demostración: '.$name.'.',
                'price' => $price, 'duration_minutes' => $duration, 'buffer_minutes' => 10,
                'min_participants' => 1, 'max_participants' => $number === 3 ? 10 : 1,
                'requires_professional' => true, 'booking_model' => 'professional', 'is_active' => true,
                ...($definition['slug'] === 'demo-canchas-arena' ? (RepairResourceBookingSeeder::ARENA_POLICIES[$name] ?? []) : []),
            ]);
            $service->forceFill(['deleted_at' => null])->save();
            $this->pivot('catalog.branch_services', ['branch_id' => $branch->id, 'service_id' => $service->id], ['is_active' => true]);
            $services[] = $service;
        }
        $professionals = [];
        $resources = [];
        foreach ($definition['professionals'] as $index => $name) {
            $email = $number === 1 && $index === 0 ? DemoData::PROFESSIONAL_EMAIL : "profesional.b{$number}.".($index + 1).'.demo@elegantbarb.test';
            $user = $this->user($email, $name.' · Demo', User::ROLE_PROFESSIONAL);
            $professional = Professional::withTrashed()->updateOrCreate(['user_id' => $user->id], [
                'business_id' => $business->id, 'name' => $name, 'email' => $email,
                'phone' => '+57 301 000 '.sprintf('%04d', $number * 10 + $index),
                'specialty' => $definition['category_name'], 'bio' => 'Perfil de demostración con experiencia en atención personalizada.',
                'commission_percentage' => 40 + $index * 5, 'is_active' => true,
            ]);
            $professional->forceFill(['deleted_at' => null])->save();
            $user->update(['barber_id' => $professional->id, 'barber_shop_id' => $business->id]);
            foreach (range(0, 6) as $day) ProfessionalAvailability::updateOrCreate([
                'professional_id' => $professional->id, 'branch_id' => $branch->id, 'day_of_week' => $day,
            ], ['start_time' => '08:00', 'end_time' => '20:00', 'is_available' => true]);
            foreach ($services as $service) $this->pivot('catalog.professional_services', [
                'professional_id' => $professional->id, 'service_id' => $service->id, 'branch_id' => $branch->id,
            ], ['commission_percentage' => $professional->commission_percentage, 'is_active' => true]);
            if ($number === 1) ProfessionalPortfolio::updateOrCreate([
                'professional_id' => $professional->id, 'title' => 'Trabajo de demostración',
            ], ['image_url' => '/mock/haircut'.($index % 2 + 1).'.png', 'description' => 'Referencia visual del catálogo de demostración.', 'sort_order' => 1]);
            $resource = Resource::withTrashed()->updateOrCreate(['business_id' => $business->id, 'name' => $definition['resource_name'].' '.($index + 1).' Demo'], [
                'branch_id' => $branch->id, 'type' => $definition['resource_type'],
                'description' => 'Recurso de demostración reservado por agenda.', 'capacity' => 1, 'is_active' => true,
            ]);
            $resource->forceFill(['deleted_at' => null])->save();
            $professionals[] = $professional;
            $resources[] = $resource;
        }
        $clients = [];
        foreach ($definition['clients'] as $index => $name) {
            $email = $number === 1 && $index === 0 ? DemoData::CLIENT_EMAIL : "cliente.b{$number}.".($index + 1).'.demo@elegantbarb.test';
            $user = $this->user($email, $name.' · Demo', User::ROLE_CLIENT);
            $client = Client::withTrashed()->updateOrCreate(['user_id' => $user->id, 'business_id' => $business->id], [
                'name' => $name, 'email' => $email, 'phone' => '+57 302 000 '.sprintf('%04d', $number * 10 + $index),
                'notes' => 'DEMO: cliente de demostración.', 'is_vip' => $index === 0,
            ]);
            $client->forceFill(['deleted_at' => null])->save();
            $user->update(['cliente_id' => $client->id]);
            $client->favoriteProfessionals()->syncWithoutDetaching([$professionals[$index % count($professionals)]->id]);
            $client->favoriteBusinesses()->syncWithoutDetaching([$business->id]);
            $clients[] = $client;
        }
        app(RepairDemoResourceBindingsSeeder::class)->seedBusiness($business);
        $this->seedAppointments($number, $business, $branch, $professionals, $resources, $services, $clients);
        $business->update(['rating' => round((float) $business->reviews()->avg('rating'), 1), 'reviews_count' => $business->reviews()->count()]);
    }

    private function seedAppointments(int $number, Business $business, BusinessBranch $branch, array $professionals, array $resources, array $services, array $clients): void
    {
        foreach (range(0, 59) as $index) {
            $offset = $index < 45 ? -90 + $index * 2 : ($index < 48 ? 0 : $index - 47);
            $date = $this->today->addDays($offset);
            $hour = $index >= 45 && $index < 48 ? 9 + ($index - 45) * 3 : 9 + ($index % 3) * 3;
            $start = $date->setHour($hour);
            $service = $services[$index % count($services)];
            $end = $start->addMinutes($service->duration_minutes);
            $professional = $professionals[$index % count($professionals)];
            $allowedResourceIds = DB::table('catalog.resource_services')->where('service_id', $service->id)->where('is_active', true)->pluck('resource_id')->all();
            $compatibleResources = array_values(array_filter($resources, fn ($resource) => in_array($resource->id, $allowedResourceIds, true)));
            if ($compatibleResources === []) continue;
            $resource = $compatibleResources[$index % count($compatibleResources)];
            $client = $clients[$index % count($clients)];
            $status = $offset < 0 ? ($index % 10 === 0 ? 'CANCELLED' : ($index % 13 === 0 ? 'NO_SHOW' : 'COMPLETED')) : ($index % 4 === 0 ? 'PENDING' : 'CONFIRMED');
            $code = sprintf('DEMO-B%d-A%03d', $number, $index + 1);
            $appointment = Appointment::withTrashed()->firstOrNew(['booking_code' => $code]);
            // A reseed never resets payment state created by the commerce seeder or the UI.
            if ($appointment->exists) continue;
            $appointment->payment_status = 'PENDING';
            $assignedProfessionalId = $service->booking_model === 'resource' ? null : $professional->id;
            $conflict = Appointment::whereKeyNot($appointment->id ?? 0)->whereDate('date', $date->format('Y-m-d'))
                ->whereIn('status', ['PENDING', 'CONFIRMED', 'RESCHEDULED'])
                ->where(fn ($q) => $q->where('resource_id', $resource->id)->when($assignedProfessionalId !== null, fn ($q) => $q->orWhere('professional_id', $assignedProfessionalId)))
                ->where('start_time', '<', $end->addMinutes(10)->format('H:i:s'))
                ->where('end_time', '>', $start->subMinutes(10)->format('H:i:s'))->exists();
            if ($conflict && in_array($status, ['PENDING', 'CONFIRMED'], true)) continue;
            $appointment->fill([
                'business_id' => $business->id, 'branch_id' => $branch->id, 'professional_id' => $assignedProfessionalId,
                'booking_model' => $service->booking_model, 'duration_minutes' => $service->duration_minutes, 'participants' => 1,
                'resource_id' => $resource->id, 'service_id' => $service->id, 'client_id' => $client->id,
                'date' => $date->format('Y-m-d'), 'start_time' => $start->format('H:i:s'), 'end_time' => $end->format('H:i:s'),
                'status' => $status, 'price' => $service->price, 'discount_amount' => 0, 'final_price' => $service->price,
                'currency' => 'COP', 'source' => 'demo', 'notes' => sprintf('DEMO: cita de demostración B%d #%03d', $number, $index + 1),
                'completed_at' => $status === 'COMPLETED' ? $end : null,
                'cancelled_at' => $status === 'CANCELLED' ? $start->subHours(2) : null,
                'checked_in_at' => $status === 'COMPLETED' ? $start->subMinutes(5) : null,
            ])->forceFill(['deleted_at' => null, 'created_at' => $start->subDays(3), 'updated_at' => $start])->save();
            if ($status === 'CANCELLED') $this->pivot('booking.appointment_cancellations', ['appointment_id' => $appointment->id], [
                'reason' => 'DEMO: cambio de disponibilidad del cliente.', 'cancelled_by_type' => 'CLIENTE',
                'cancelled_by_id' => $client->id, 'refund_amount' => 0, 'created_at' => $start->subHours(2),
            ], false);
            if ($index === 50) $this->pivot('booking.appointment_reschedules', [
                'appointment_id' => $appointment->id, 'reason' => 'DEMO: reprogramación solicitada por el cliente.',
            ], [
                'old_date' => $date->subDay()->format('Y-m-d'), 'old_start_time' => $start->format('H:i:s'),
                'old_professional_id' => $assignedProfessionalId, 'new_date' => $date->format('Y-m-d'),
                'new_start_time' => $start->format('H:i:s'), 'new_professional_id' => $assignedProfessionalId,
                'rescheduled_by_type' => 'CLIENTE', 'rescheduled_by_id' => $client->id, 'created_at' => $this->today,
            ], false);
            if ($status === 'COMPLETED' && $index % 4 === 1) Review::updateOrCreate(['appointment_id' => $appointment->id], [
                'business_id' => $business->id, 'branch_id' => $branch->id, 'professional_id' => $assignedProfessionalId,
                'client_id' => $client->id, 'rating' => $index % 3 === 0 ? 4 : 5,
                'comment' => ['Puntuales y muy atentos. Volveré.', 'La reserva fue sencilla y el servicio excelente.', 'Un espacio cómodo y una atención muy cuidada.'][$index % 3],
                'is_verified' => true, 'is_active' => true, 'business_response' => 'Gracias por compartir tu experiencia.',
                'responded_at' => $end->addDay(),
            ]);
        }
    }

    private function pivot(string $table, array $identity, array $values, bool $updatedAt = true): void
    {
        if (! DB::table($table)->where($identity)->exists()) $values['created_at'] ??= now();
        if ($updatedAt) $values['updated_at'] = now();
        DB::table($table)->updateOrInsert($identity, $values);
    }

    private function businessDefinitions(): array
    {
        return [
            ['slug' => DemoData::BUSINESS_SLUG, 'name' => 'Estudio Norte · Demo',
                'admin_email' => DemoData::ADMIN_EMAIL, 'admin_name' => 'Andrés · Administrador demo',
                'category_slug' => 'demo-barberia', 'category_name' => 'Barbería demo', 'icon' => 'Scissors', 'color' => '#087F70',
                'description' => 'Barbería de demostración: cortes de autor, barba y atención personalizada.',
                'address' => 'Carrera 15 # 93-47 · Bogotá (demo)', 'lat' => 4.6764, 'lng' => -74.0486,
                'resource_name' => 'Sillón', 'resource_type' => 'CHAIR',
                'professionals' => ['Mateo Ríos', 'Valentina Cruz', 'Simón Duarte'],
                'clients' => ['Laura Méndez', 'Daniel Torres', 'Ana Beltrán', 'Julián Vega'],
                'services' => [['Corte de autor', 45000, 45], ['Diseño de barba', 30000, 30], ['Corte y barba', 65000, 60], ['Ritual capilar', 55000, 45]]],
            ['slug' => 'demo-spa-botanico', 'name' => 'Spa Botánico · Demo',
                'admin_email' => 'admin.spa.demo@elegantbarb.test', 'admin_name' => 'Mariana · Administradora demo',
                'category_slug' => 'demo-bienestar', 'category_name' => 'Bienestar demo', 'icon' => 'Flower2', 'color' => '#9765B8',
                'description' => 'Espacio de demostración para terapias de bienestar y cuidado personal.',
                'address' => 'Calle 85 # 12-30 · Bogotá (demo)', 'lat' => 4.6695, 'lng' => -74.0531,
                'resource_name' => 'Cabina', 'resource_type' => 'CABIN',
                'professionals' => ['Camila Sol', 'Nicolás Mora'], 'clients' => ['Isabel Lara', 'Tomás Gil', 'Sara Luna', 'Emilio Paz'],
                'services' => [['Masaje relajante', 120000, 60], ['Limpieza facial', 95000, 60], ['Ritual botánico', 160000, 90]]],
            ['slug' => 'demo-canchas-arena', 'name' => 'Canchas Arena · Demo',
                'admin_email' => 'admin.arena.demo@elegantbarb.test', 'admin_name' => 'Diego · Administrador demo',
                'category_slug' => 'demo-deportes', 'category_name' => 'Deportes demo', 'icon' => 'Trophy', 'color' => '#D47B28',
                'description' => 'Centro deportivo de demostración con reservas de cancha y entrenamiento.',
                'address' => 'Carrera 7 # 120-20 · Bogotá (demo)', 'lat' => 4.6985, 'lng' => -74.0327,
                'resource_name' => 'Cancha', 'resource_type' => 'COURT',
                'professionals' => ['Lucas León', 'Emma Vidal'], 'clients' => ['Paula Rey', 'Santiago Mar', 'Lucía Cano', 'Felipe Ruiz'],
                'services' => [['Reserva cancha fútbol 5', 100000, 60], ['Entrenamiento personalizado', 75000, 60], ['Partido extendido', 140000, 90]]],
        ];
    }
}
