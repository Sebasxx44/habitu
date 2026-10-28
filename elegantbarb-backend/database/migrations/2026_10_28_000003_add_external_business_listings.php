<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business.businesses', fn (Blueprint $table) => $this->columns($table));
        DB::statement('ALTER TABLE business.businesses ALTER COLUMN owner_user_id DROP NOT NULL');
        DB::statement("ALTER TABLE business.businesses ADD CONSTRAINT businesses_booking_mode_check CHECK (booking_mode IN ('internal', 'external'))");
        // Fresh installations are populated by ProductionCatalogSeeder, including veterinary care.
        if (DB::table('platform.business_categories')->exists()) DB::table('platform.business_categories')->insertOrIgnore([
            'slug' => 'veterinaria', 'name' => 'Veterinaria', 'description' => 'Clínicas y servicios veterinarios',
            'icon' => 'PawPrint', 'color' => '#0D9488', 'sort_order' => 11, 'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE business.businesses DROP CONSTRAINT IF EXISTS businesses_booking_mode_check');
        Schema::table('business.businesses', fn (Blueprint $table) => $table->dropColumn(['booking_mode', 'booking_url', 'listing_source_url']));
        // Preserve unclaimed listings and category edits; never fabricate an owner or delete referenced categories.
        if (! DB::table('business.businesses')->whereNull('owner_user_id')->exists()) {
            DB::statement('ALTER TABLE business.businesses ALTER COLUMN owner_user_id SET NOT NULL');
        }
    }

    private function columns(Blueprint $table): void
    {
        $table->string('booking_mode', 20)->default('internal');
        $table->string('booking_url', 2048)->nullable();
        $table->string('listing_source_url', 2048)->nullable();
    }
};
