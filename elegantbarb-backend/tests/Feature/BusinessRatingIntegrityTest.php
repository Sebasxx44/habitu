<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Client;
use App\Modules\Reviews\Models\Review;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class BusinessRatingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_businesses_never_receive_unearned_ratings_even_with_the_legacy_database_default(): void
    {
        $categoryId = Business::factory()->create()->business_category_id;
        DB::statement('ALTER TABLE business.businesses ALTER COLUMN rating SET DEFAULT 5.0');
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $response = $this->postJson('/api/v2/businesses', [
            'business_category_id' => $categoryId, 'name' => 'Nuevo negocio', 'slug' => 'nuevo-sin-resenas',
            'rating' => 5, 'reviews_count' => 99, 'verified' => true,
        ])->assertCreated()->assertJsonPath('data.rating', '0.0')
            ->assertJsonPath('data.reviews_count', 0)->assertJsonPath('data.verified', false);
        $this->assertDatabaseHas('business.businesses', ['id' => $response->json('data.id'), 'rating' => 0, 'reviews_count' => 0, 'verified' => false]);
    }

    public function test_migration_repairs_only_the_exact_preview_slugs_without_any_review_history(): void
    {
        DB::statement('ALTER TABLE business.businesses ALTER COLUMN rating SET DEFAULT 5.0');
        $empty = Business::factory()->create(['slug' => 'cuba-prueba-bambinos', 'rating' => 5, 'reviews_count' => 0]);
        $counted = Business::factory()->create(['slug' => 'cuba-prueba-imperio', 'rating' => 4.2, 'reviews_count' => 1]);
        $reviewed = Business::factory()->create(['slug' => 'cuba-prueba-barber-house-studio', 'rating' => 4.7, 'reviews_count' => 0]);
        $unrelated = Business::factory()->create(['slug' => 'otro-negocio', 'rating' => 5, 'reviews_count' => 0]);
        Review::create(['business_id' => $reviewed->id, 'client_id' => Client::factory()->create()->id,
            'rating' => 4, 'is_active' => true, 'is_verified' => true]);
        $migration = require database_path('migrations/2026_10_28_000002_remove_unearned_business_ratings.php');
        $migration->up();
        $migration->up();

        $this->assertSame('0.0', $empty->fresh()->rating);
        $this->assertSame('4.2', $counted->fresh()->rating);
        $this->assertSame('4.7', $reviewed->fresh()->rating);
        $this->assertSame('5.0', $unrelated->fresh()->rating);
        $new = Business::factory()->create();
        $this->assertSame('0.0', $new->fresh()->rating);
    }
}
