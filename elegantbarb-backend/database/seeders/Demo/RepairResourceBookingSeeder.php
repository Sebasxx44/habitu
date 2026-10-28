<?php

declare(strict_types=1);

namespace Database\Seeders\Demo;

use App\Modules\Business\Models\Business;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/** Repairs only named resource-booking fixtures; never changes appointments. */
final class RepairResourceBookingSeeder extends Seeder
{
    public const ARENA_POLICIES = [
        'Reserva cancha fútbol 5' => ['booking_model' => 'resource', 'requires_professional' => false, 'resource_professional_optional' => false,
            'duration_mode' => 'selectable', 'duration_options' => [60, 120, 180], 'duration_minutes' => 60, 'slot_interval_minutes' => 60, 'requires_confirmation' => false],
        'Partido extendido' => ['booking_model' => 'resource', 'requires_professional' => false, 'resource_professional_optional' => false,
            'duration_mode' => 'selectable', 'duration_options' => [90, 180], 'duration_minutes' => 90, 'slot_interval_minutes' => 30, 'requires_confirmation' => false],
    ];

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) throw new \RuntimeException('La reparación de datos demo sólo está habilitada en local o testing.');
        $business = Business::where('slug', 'canchas-la-10')->where('name', 'Canchas La 10')->first();
        if ($business) DB::transaction(function () use ($business) {
            foreach (['Cancha Fútbol 5 (1h)' => ['Cancha 1 - Fútbol 5', 'Cancha 2 - Fútbol 5'], 'Cancha Fútbol 7 (1h)' => ['Cancha 3 - Fútbol 7']] as $name => $names) {
                $service = $business->services()->where('name', $name)->first();
                if (! $service) continue;
                $resources = $business->resources()->whereIn('name', $names)->get();
                if ($resources->isEmpty()) continue;
                $service->fill(['booking_model' => 'resource', 'requires_professional' => false, 'duration_mode' => 'selectable',
                    'duration_options' => [60,120,180], 'slot_interval_minutes' => 60, 'duration_minutes' => 60, 'requires_confirmation' => false]);
                if ($service->isDirty()) $service->save();
                // Preserve relation history: disable the generic migration binding and activate the real courts.
                DB::table('catalog.resource_services')->where('service_id', $service->id)->whereNotIn('resource_id', $resources->modelKeys())->where('is_active', true)->update(['is_active' => false, 'updated_at' => now()]);
                foreach ($resources as $resource) {
                    $resource->fill(['attributes' => array_merge($resource->attributes ?? [], ['sport_type' => str_contains($name, '5') ? 'football_5' : 'football_7', 'surface' => 'synthetic'])]);
                    if ($resource->isDirty()) $resource->save();
                    $link = DB::table('catalog.resource_services')->where('service_id', $service->id)->where('resource_id', $resource->id)->first();
                    if (! $link) DB::table('catalog.resource_services')->insert(['service_id' => $service->id, 'resource_id' => $resource->id, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
                    elseif (! $link->is_active) DB::table('catalog.resource_services')->where('id', $link->id)->update(['is_active' => true, 'updated_at' => now()]);
                }
            }
        });
        $arena = Business::where('slug', 'demo-canchas-arena')->where('name', 'Canchas Arena · Demo')->first();
        if (! $arena) return;
        DB::transaction(function () use ($arena) {
            foreach (self::ARENA_POLICIES as $name => $policy) {
                $service = $arena->services()->where('name', $name)->first();
                if (! $service) continue;
                $service->fill($policy);
                if ($service->isDirty()) $service->save();
            }
            foreach ($arena->resources()->whereIn('name', ['Cancha 1 Demo', 'Cancha 2 Demo'])->get() as $resource) {
                $resource->fill(['capacity' => 1]);
                if ($resource->isDirty()) $resource->save();
            }
            app(RepairDemoResourceBindingsSeeder::class)->seedBusiness($arena);
        });
    }
}
