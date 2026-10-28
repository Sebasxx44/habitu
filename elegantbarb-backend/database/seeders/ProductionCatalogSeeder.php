<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

final class ProductionCatalogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(fn () => $this->initializeCatalogs());
    }

    private function initializeCatalogs(): void
    {
        // Serialize simultaneous release jobs without resetting administrators' catalog changes.
        DB::select('SELECT pg_advisory_xact_lock(?)', [2026102802]);

        if (! DB::table('platform.business_categories')->exists()) {
            $this->call(BusinessCategorySeeder::class);
        }

        if (! DB::table('finance.payment_methods')->exists()) {
            // These are reference labels. Payment gateways remain gated by their own credentials.
            $this->call(PaymentMethodSeeder::class);
        }
    }
}
