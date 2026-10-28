<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Services\WompiGateway;
use Database\Seeders\ProductionCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class ProductionCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_production_catalogs_are_initialized_without_demo_accounts_or_payments(): void
    {
        config(['services.wompi.public_key' => null, 'services.wompi.private_key' => null,
            'services.wompi.integrity_secret' => null, 'services.wompi.events_secret' => null]);
        $this->seed(ProductionCatalogSeeder::class);

        $this->assertDatabaseCount('platform.business_categories', 11);
        $this->assertDatabaseHas('platform.business_categories', ['slug' => 'barberia', 'is_active' => true]);
        $this->assertDatabaseCount('finance.payment_methods', 5);
        $this->assertDatabaseHas('finance.payment_methods', ['code' => 'cash', 'is_active' => true]);
        $this->assertDatabaseHas('finance.payment_methods', ['code' => 'pse', 'is_active' => true]);
        $this->assertSame(0, User::count());
        $this->assertDatabaseCount('business.businesses', 0);
        $this->assertDatabaseCount('finance.wallets', 0);
        $this->assertDatabaseCount('finance.payments', 0);
        $this->assertFalse(app(WompiGateway::class)->enabled());
    }

    public function test_repeated_initialization_preserves_disabled_and_renamed_catalog_entries(): void
    {
        $this->seed(ProductionCatalogSeeder::class);
        DB::table('platform.business_categories')->where('slug', 'barberia')->update([
            'name' => 'Nombre personalizado', 'is_active' => false,
        ]);
        DB::table('finance.payment_methods')->where('code', 'cash')->update([
            'name' => 'Efectivo deshabilitado', 'is_active' => false,
        ]);

        $this->seed(ProductionCatalogSeeder::class);
        $this->assertDatabaseCount('platform.business_categories', 11);
        $this->assertDatabaseCount('finance.payment_methods', 5);
        $this->assertDatabaseHas('platform.business_categories', [
            'slug' => 'barberia', 'name' => 'Nombre personalizado', 'is_active' => false,
        ]);
        $this->assertDatabaseHas('finance.payment_methods', [
            'code' => 'cash', 'name' => 'Efectivo deshabilitado', 'is_active' => false,
        ]);
    }

    public function test_each_catalog_is_initialized_independently_and_existing_custom_catalogs_are_preserved(): void
    {
        DB::table('platform.business_categories')->insert([
            'slug' => 'personalizada', 'name' => 'Categoría propia', 'is_active' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->seed(ProductionCatalogSeeder::class);

        $this->assertDatabaseCount('platform.business_categories', 1);
        $this->assertDatabaseHas('platform.business_categories', ['slug' => 'personalizada', 'is_active' => false]);
        $this->assertDatabaseCount('finance.payment_methods', 5);
    }

    public function test_existing_payment_catalog_is_not_extended_when_only_categories_are_empty(): void
    {
        DB::table('finance.payment_methods')->insert([
            'code' => 'custom', 'name' => 'Método propio', 'is_active' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->seed(ProductionCatalogSeeder::class);

        $this->assertDatabaseCount('platform.business_categories', 11);
        $this->assertDatabaseCount('finance.payment_methods', 1);
        $this->assertDatabaseHas('finance.payment_methods', ['code' => 'custom', 'name' => 'Método propio', 'is_active' => false]);
    }
}
