<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\BranchSchedule;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Catalog\Models\ServiceCategory;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\People\Models\ProfessionalAvailability;
use App\Modules\Platform\Models\BusinessCategory;
use App\Modules\Reviews\Models\Review;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local-only marketplace fixtures. Public references: PereiraReferences; everything
 * operational is synthetic and visibly marked DEMO. No external calls or deliveries.
 * Existing businesses (including archived demo records) are skipped as a whole: a rerun
 * never resets bookings, balances, staff, schedules, promos or user edits.
 */
class PereiraDemoSeeder extends Seeder
{
    private const PREFIX = 'pereira-demo-';
    private const DISCLAIMER = 'DEMO: referencia pública de un establecimiento. Profesionales, servicios, precios, horarios, promociones, reservas y reseñas son ficticios. No representa una alianza ni permite reservar con el establecimiento real. Mapa aproximado del sector, no una entrada verificada.';

    private CarbonImmutable $now;
    private int $ownerId;
    private Client $demoClient;
    private ?int $cityId;

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('PereiraDemoSeeder sólo se permite en local/testing.');
        }

        $this->now = CarbonImmutable::now(config('booking.timezone', 'America/Bogota'));
        Model::withoutEvents(fn () => DB::transaction(fn () => $this->seed()));
        $this->command?->info('Pereira DEMO preparado; los registros existentes permanecen intactos. Fuentes: PereiraReferences.php.');
    }

    private function seed(): void
    {
        DB::statement("SELECT pg_advisory_xact_lock(hashtext('elegantbarb-pereira-demo-v1'))");
        $this->ownerId = User::where('email', DemoData::ADMIN_EMAIL)->firstOrFail()->id;
        $clientUser = User::where('email', DemoData::CLIENT_EMAIL)->firstOrFail();
        $this->demoClient = Client::where('user_id', $clientUser->id)->firstOrFail();
        // Geography is optional in installations migrated from the legacy public schema.
        $cityTable = Schema::hasTable('platform.cities') ? 'platform.cities' : (Schema::hasTable('public.cities') ? 'public.cities' : null);
        $this->cityId = $cityTable ? DB::table($cityTable)->whereRaw('LOWER(name) = ?', ['pereira'])->value('id') : null;
        $profiles = PereiraReferences::profiles();
        foreach (PereiraReferences::businesses() as $index => $reference) {
            $slug = self::PREFIX.$reference['key'];
            if (Business::withTrashed()->where('slug', $slug)->exists()) continue;
            $this->business($index + 1, $slug, $reference, $profiles[$reference['profile']]);
        }
    }

    private function business(int $number, string $slug, array $reference, array $profile): void
    {
        [$categorySlug, $categoryName, $icon, $color] = $profile['category'];
        $category = BusinessCategory::firstOrCreate(['slug' => $categorySlug], [
            'name' => $categoryName, 'icon' => $icon, 'color' => $color, 'is_active' => true,
        ]);
        $business = Business::create([
            'slug' => $slug, 'owner_user_id' => $this->ownerId, 'business_category_id' => $category->id,
            'name' => $reference['name'].' · DEMO', 'description' => self::DISCLAIMER,
            'website' => $reference['source'], 'primary_color' => $color,
            'verified' => false, 'is_active' => true, 'uses_professionals' => true, 'uses_resources' => false,
            'rating' => 4.3, 'reviews_count' => count($reference['branches']) * 3,
            // Null media is intentional: category-specific UI artwork, never an unrelated stock haircut.
            'logo_url' => null, 'banner_url' => null,
        ]);
        if ($number === 1) $this->demoClient = Client::create([
            'user_id' => $this->demoClient->user_id, 'business_id' => $business->id,
            'name' => $this->demoClient->name, 'email' => $this->demoClient->email,
            'notes' => 'DEMO Pereira: perfil adicional de la cuenta demo; su perfil principal permanece intacto.',
        ]);
        $serviceCategory = ServiceCategory::create(['business_id' => $business->id, 'name' => $categoryName.' · DEMO']);
        $services = [];
        foreach ($profile['services'] as [$name, $price, $minutes]) {
            $services[] = Service::create([
                'business_id' => $business->id, 'service_category_id' => $serviceCategory->id,
                'name' => $name.' · DEMO', 'description' => 'DEMO: servicio, tarifa en COP y duración simulados para probar reservas. No es una oferta del establecimiento real.',
                'price' => $price, 'duration_minutes' => $minutes, 'buffer_minutes' => 10,
                'requires_professional' => true, 'min_participants' => 1, 'max_participants' => 1, 'is_active' => true,
            ]);
        }
        foreach ($reference['branches'] as $branchIndex => $branchReference) {
            $this->branch($number, $branchIndex + 1, $business, $branchReference, $reference['profile'], $profile, $services);
        }
        $this->promotions($number, $business, $services);
    }

    private function branch(int $number, int $branchNumber, Business $business, array $reference, string $profileKey, array $profile, array $services): void
    {
        [$zone, $address, $latitude, $longitude] = $reference;
        $branch = BusinessBranch::create([
            'business_id' => $business->id, 'name' => $zone.' · DEMO',
            'address' => $address.' · Ubicación aproximada DEMO', 'city_id' => $this->cityId,
            'lat' => $latitude, 'lng' => $longitude, 'is_main_branch' => $branchNumber === 1, 'is_active' => true,
        ]);
        $sundayClosed = ! in_array($profileKey, ['spa', 'fitness'], true);
        foreach (range(0, 6) as $day) BranchSchedule::create([
            'branch_id' => $branch->id, 'day' => (string) $day, 'open_time' => '08:00', 'close_time' => '20:00',
            'is_closed' => $sundayClosed && $day === 0,
        ]);
        foreach ($services as $service) $this->insert('catalog.branch_services', [
            'branch_id' => $branch->id, 'service_id' => $service->id, 'is_active' => true,
        ]);

        // Names and contacts are invented. Profiles have no real person's account or phone.
        $names = ['Lucía Prado', 'Mateo Soler', 'Sara Montenegro', 'Lucas Beltrán', 'Emma Valdés', 'Nicolás Duarte',
            'Julia Montes', 'Tomás Vidal', 'Clara Luján', 'Samuel Valle', 'Elena Rivas', 'Daniel Céspedes'];
        $professionals = [];
        $clients = [];
        foreach ([0, 1] as $index) {
            $identity = sprintf('P%02d-S%d-%d', $number, $branchNumber, $index + 1);
            $professional = Professional::create([
                'business_id' => $business->id, 'name' => $names[($number * 2 + $index + $branchNumber) % count($names)].' · DEMO '.$identity,
                'email' => strtolower('profesional.'.$identity.'.demo@elegantbarb.test'),
                'specialty' => $profile['specialty'], 'bio' => 'DEMO: profesional ficticio; no corresponde a empleados del establecimiento real.',
                'is_active' => true, 'commission_percentage' => 40 + $index * 5,
            ]);
            foreach (range(0, 6) as $day) ProfessionalAvailability::create([
                'professional_id' => $professional->id, 'branch_id' => $branch->id, 'day_of_week' => $day,
                'start_time' => $index === 0 ? '09:00' : '10:00', 'end_time' => $index === 0 ? '17:00' : '18:00',
                'is_available' => ! ($sundayClosed && $day === 0),
            ]);
            foreach ($services as $service) $this->insert('catalog.professional_services', [
                'professional_id' => $professional->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
                'commission_percentage' => $professional->commission_percentage, 'is_active' => true,
            ]);
            $professionals[] = $professional;
            $clients[] = Client::create([
                'business_id' => $business->id, 'name' => ['Alicia Vega', 'Bruno Salas'][$index].' · DEMO '.$identity,
                'email' => strtolower('cliente.'.$identity.'.demo@elegantbarb.test'),
                'notes' => 'DEMO: identidad ficticia para actividad del marketplace Pereira.',
            ]);
        }
        $this->appointments($number, $branchNumber, $business, $branch, $professionals, $clients, $services, $sundayClosed);
    }

    private function appointments(int $number, int $branchNumber, Business $business, BusinessBranch $branch, array $professionals, array $clients, array $services, bool $sundayClosed): void
    {
        foreach (range(0, 17) as $index) {
            $offset = $index < 10 ? -30 + $index * 3 : ($index < 12 ? 0 : 3 + ($index - 12) * 3 + $number);
            $date = $this->now->startOfDay()->addDays($offset);
            if ($sundayClosed && $date->isSunday()) $date = $date->addDay();
            $start = $date->setTime($index % 2 === 0 ? 10 : 14, 0);
            $service = $services[$index % count($services)];
            $end = $start->addMinutes($service->duration_minutes);
            $professional = $professionals[$index % 2];
            // This login has an additional profile scoped to Pereira; its original profile remains intact.
            $client = $number === 1 && $branchNumber === 1 && in_array($index, [0, 12], true)
                ? $this->demoClient : $clients[$index % 2];
            $status = $index === 8 ? 'CANCELLED' : ($index === 9 ? 'NO_SHOW' : ($end->isBefore($this->now) ? 'COMPLETED' : ($index % 3 === 0 ? 'PENDING' : 'CONFIRMED')));
            $appointment = new Appointment([
                'booking_code' => sprintf('PER-DEMO-%02d-S%d-A%02d', $number, $branchNumber, $index + 1),
                'business_id' => $business->id, 'branch_id' => $branch->id, 'professional_id' => $professional->id,
                'service_id' => $service->id, 'client_id' => $client->id,
                'date' => $date->toDateString(), 'start_time' => $start->format('H:i:s'), 'end_time' => $end->format('H:i:s'),
                'status' => $status, 'payment_status' => 'PENDING', 'currency' => 'COP',
                'price' => $service->price, 'final_price' => $service->price, 'discount_amount' => 0,
                'notes' => 'DEMO Pereira: reserva simulada. No se ha cobrado ni contactado al establecimiento real.', 'source' => 'demo',
                'completed_at' => $status === 'COMPLETED' ? $end : null,
                'checked_in_at' => $status === 'COMPLETED' ? $start : null,
                'cancelled_at' => $status === 'CANCELLED' ? $start->subHours(2) : null,
            ]);
            $appointment->forceFill([
                'created_at' => $start->subDays(3)->min($this->now->subHours(6)), 'updated_at' => $start->min($this->now),
            ])->save();
            if ($status === 'CANCELLED') DB::table('booking.appointment_cancellations')->insert([
                'appointment_id' => $appointment->id, 'reason' => 'DEMO: cambio de planes simulado.',
                'cancelled_by_type' => 'CLIENTE', 'cancelled_by_id' => $client->id, 'refund_amount' => 0, 'created_at' => $start->subHours(2),
            ]);
            if (in_array($index, [0, 3, 6], true)) (new Review([
                'business_id' => $business->id, 'branch_id' => $branch->id, 'professional_id' => $professional->id,
                'client_id' => $client->id, 'appointment_id' => $appointment->id, 'rating' => $index === 3 ? 5 : 4,
                'comment' => 'DEMO: reseña ficticia para probar la plataforma; no describe una visita real. '.[
                    0 => 'El proceso de reserva resultó claro.', 3 => 'La atención simulada comenzó a la hora acordada.', 6 => 'Pude elegir el servicio y consultar el horario.',
                ][$index],
                'is_verified' => false, 'is_active' => true,
            ]))->forceFill(['created_at' => $end->addDay(), 'updated_at' => $end->addDay()])->save();
        }
    }

    private function promotions(int $number, Business $business, array $services): void
    {
        foreach ([false, true] as $expired) {
            $promotion = Promotion::create([
                'business_id' => $business->id, 'business_category_id' => $business->business_category_id,
                'promo_code' => sprintf('PEREIRA%02d%s', $number, $expired ? '-OLD' : ''),
                'title' => $expired ? 'DEMO · Promoción finalizada' : 'DEMO · 10% para tu próxima reserva',
                'description' => 'Promoción ficticia del entorno local. No es una oferta del establecimiento real.',
                'type' => 'PERCENTAGE', 'discount' => 10, 'max_discount' => 20000, 'per_user_limit' => 2,
                'start_date' => $this->now->subDays($expired ? 45 : 2)->toDateString(),
                'end_date' => ($expired ? $this->now->subDays(2) : $this->now->addDays(60))->toDateString(),
                'usage_limit' => 100, 'usage_count' => 0, 'is_active' => true,
            ]);
            foreach (array_slice($services, 0, 3) as $service) $this->insert('marketing.promotion_service', [
                'promotion_id' => $promotion->id, 'service_id' => $service->id, 'discount' => 10, 'type' => 'PERCENTAGE',
            ]);
        }
    }

    private function insert(string $table, array $values): void
    {
        DB::table($table)->insert([...$values, 'created_at' => $this->now, 'updated_at' => $this->now]);
    }
}
