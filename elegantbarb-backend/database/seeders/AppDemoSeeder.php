<?php

namespace Database\Seeders;

use Database\Seeders\Demo\DemoCatalogSeeder;
use Database\Seeders\Demo\DemoCommerceSeeder;
use Database\Seeders\Demo\DemoEngagementSeeder;
use Database\Seeders\Demo\PereiraDemoSeeder;
use Database\Seeders\Demo\RepairResourceBookingSeeder;
use Database\Seeders\Demo\RepairDemoResourceBindingsSeeder;
use Database\Seeders\Demo\BenefitsDemoSeeder;
use Database\Seeders\Demo\DemoPricingProfileSeeder;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\DB;

class AppDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('Los datos de demostración sólo se permiten en entornos local/testing.');
        }

        DB::transaction(function () {
            DB::statement("SELECT pg_advisory_xact_lock(hashtext('elegantbarb-app-demo-seed'))");
            $this->call([
                DemoCatalogSeeder::class,
                DemoCommerceSeeder::class,
                DemoEngagementSeeder::class,
                PereiraDemoSeeder::class,
                RepairResourceBookingSeeder::class,
                RepairDemoResourceBindingsSeeder::class,
                BenefitsDemoSeeder::class,
                DemoPricingProfileSeeder::class,
            ]);
        });

        $this->command?->info('Datos demo cargados sin eliminar datos existentes. Las cuentas usan el dominio elegantbarb.test.');
    }
}
