<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MarketplaceMigrationRollbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketplace_increment_reverses_and_reapplies_without_removing_base_schema(): void
    {
        // Executed only in the disposable PostgreSQL guarded by tests/bootstrap.php.
        $files = array_values(array_filter(glob(database_path('migrations/2026_10_04_*.php')), fn ($path) => (int) explode('_', basename($path))[3] >= 41));
        sort($files);
        $migrations = array_map(fn ($path) => require $path, $files);
        foreach (array_reverse($migrations) as $migration) {
            $this->assertInstanceOf(Migration::class, $migration);
            $migration->down();
        }
        $this->assertTrue(Schema::hasTable('public.users'));
        $this->assertTrue(Schema::hasTable('booking.appointments'));
        $this->assertFalse(Schema::hasTable('platform.marketplace_outbox'));
        foreach ($migrations as $migration) $migration->up();
        $this->assertTrue(Schema::hasTable('platform.marketplace_outbox'));
        $this->assertTrue(Schema::hasTable('marketing.retention_attributions'));
    }
}
