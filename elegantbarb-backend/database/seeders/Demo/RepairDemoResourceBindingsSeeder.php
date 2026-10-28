<?php

declare(strict_types=1);

namespace Database\Seeders\Demo;

use App\Modules\Business\Models\Business;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Explicit fixture compatibility; never derives a binding from an appointment or changes existing rows. */
final class RepairDemoResourceBindingsSeeder extends Seeder
{
    /** @var array<string, array{name: string, services: list<string>, resources: list<string>}> */
    private const FIXTURES = [
        'demo-estudio-norte' => [
            'name' => 'Estudio Norte · Demo',
            'services' => ['Corte de autor', 'Diseño de barba', 'Corte y barba', 'Ritual capilar'],
            'resources' => ['Sillón 1 Demo', 'Sillón 2 Demo', 'Sillón 3 Demo'],
        ],
        'demo-spa-botanico' => [
            'name' => 'Spa Botánico · Demo',
            'services' => ['Masaje relajante', 'Limpieza facial', 'Ritual botánico'],
            'resources' => ['Cabina 1 Demo', 'Cabina 2 Demo'],
        ],
        'demo-canchas-arena' => [
            'name' => 'Canchas Arena · Demo',
            'services' => ['Reserva cancha fútbol 5', 'Entrenamiento personalizado', 'Partido extendido'],
            'resources' => ['Cancha 1 Demo', 'Cancha 2 Demo'],
        ],
        'serenity-spa-wellness' => [
            'name' => 'Serenity Spa & Wellness',
            'services' => ['Masaje Relajante (60min)', 'Masaje Descontracturante'],
            'resources' => ['Sala de Masajes 1', 'Sala de Masajes 2'],
        ],
    ];

    public function run(): void
    {
        $this->guardEnvironment();
        DB::transaction(function () {
            foreach (self::FIXTURES as $slug => $fixture) {
                $business = Business::where('slug', $slug)->where('name', $fixture['name'])->first();
                if ($business) $this->seedBusiness($business);
            }
        });
    }

    public function seedBusiness(Business $business): void
    {
        $this->guardEnvironment();
        $fixture = self::FIXTURES[$business->slug] ?? null;
        if (! $fixture || $business->name !== $fixture['name']) return;
        $services = $business->services()->whereIn('name', $fixture['services'])->where('is_active', true)->get();
        $resources = $business->resources()->whereIn('name', $fixture['resources'])->where('is_active', true)->get();
        foreach ($services as $service) foreach ($resources as $resource) {
            $links = DB::table('catalog.branch_services')->where('service_id', $service->id);
            if ($links->exists() && ! (clone $links)->where('branch_id', $resource->branch_id)->where('is_active', true)->exists()) continue;
            DB::table('catalog.resource_services')->insertOrIgnore([
                'service_id' => $service->id, 'resource_id' => $resource->id, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'testing'])) throw new \RuntimeException('La reparación de vínculos demo sólo está habilitada en local o testing.');
    }
}
