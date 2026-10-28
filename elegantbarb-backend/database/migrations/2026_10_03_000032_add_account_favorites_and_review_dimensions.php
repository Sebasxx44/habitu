<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('people.account_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('business_id')->nullable()->constrained('business.businesses')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('catalog.services')->cascadeOnDelete();
            $table->foreignId('professional_id')->nullable()->constrained('people.professionals')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'business_id']);
            $table->unique(['user_id', 'service_id']);
            $table->unique(['user_id', 'professional_id']);
            $table->index(['user_id', 'created_at']);
        });
        DB::statement('ALTER TABLE people.account_favorites ADD CONSTRAINT favorite_one_target CHECK (num_nonnulls(business_id, service_id, professional_id) = 1)');
        // Keep legacy rows intact; consolidate profiles belonging to the same account.
        foreach (['business' => 'businesses', 'professional' => 'professionals'] as $type => $plural) {
            DB::statement("INSERT INTO people.account_favorites (user_id, {$type}_id, created_at, updated_at)
                SELECT c.user_id, f.{$type}_id, MIN(f.created_at), MAX(f.updated_at)
                FROM people.favorite_{$plural} f JOIN people.clients c ON c.id=f.client_id JOIN users u ON u.id=c.user_id
                WHERE c.deleted_at IS NULL GROUP BY c.user_id, f.{$type}_id ON CONFLICT DO NOTHING");
        }
        Schema::table('reviews.reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('service_rating')->nullable();
            $table->unsignedTinyInteger('professional_rating')->nullable();
            $table->unsignedTinyInteger('business_rating')->nullable();
        });
        foreach (['service_rating', 'professional_rating', 'business_rating'] as $column) {
            DB::statement("ALTER TABLE reviews.reviews ADD CONSTRAINT review_{$column}_range CHECK ({$column} BETWEEN 1 AND 5)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('people.account_favorites');
        Schema::table('reviews.reviews', fn (Blueprint $table) => $table->dropColumn(['service_rating', 'professional_rating', 'business_rating']));
    }
};
