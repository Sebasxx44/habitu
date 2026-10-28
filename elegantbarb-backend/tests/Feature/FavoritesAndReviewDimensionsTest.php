<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FavoritesAndReviewDimensionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_preserves_legacy_favorites_and_consolidates_profiles_for_one_account(): void
    {
        $migration = require database_path('migrations/2026_10_03_000032_add_account_favorites_and_review_dimensions.php');
        $migration->down(); // This test is guarded by the isolated testing database configuration.
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $business = Business::factory()->create();
        $professional = Professional::create(['business_id' => $business->id, 'name' => 'Saved professional', 'is_active' => true]);
        foreach ([1, 2] as $number) {
            $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
            DB::table('people.favorite_businesses')->insert(['client_id' => $client->id, 'business_id' => $business->id, 'created_at' => now(), 'updated_at' => now()]);
            if ($number === 1) DB::table('people.favorite_professionals')->insert(['client_id' => $client->id, 'professional_id' => $professional->id, 'created_at' => now(), 'updated_at' => now()]);
        }
        $migration->up();
        $this->assertSame(2, DB::table('people.account_favorites')->where('user_id', $user->id)->count());
        $this->assertSame(2, DB::table('people.favorite_businesses')->count());
        $this->assertSame(1, DB::table('people.favorite_professionals')->count());
    }

    public function test_all_favorite_types_are_account_scoped_idempotent_and_keep_private_fields_private(): void
    {
        $business = Business::factory()->create();
        $service = Service::factory()->create(['business_id' => $business->id]);
        $professional = Professional::create(['business_id' => $business->id, 'name' => 'Professional', 'email' => 'private@example.test', 'is_active' => true]);
        $user = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($user); // No business-bound client profile is required to save a favorite.
        foreach (['business' => $business->id, 'service' => $service->id, 'professional' => $professional->id] as $type => $id) {
            $this->putJson("/api/v2/favorites/$type/$id")->assertOk()->assertJsonPath('data.is_favorite', true);
            $this->putJson("/api/v2/favorites/$type/$id")->assertOk();
        }
        $this->assertSame(3, DB::table('people.account_favorites')->count());
        $this->getJson('/api/v2/favorites')->assertOk()->assertJsonPath('data.total', 3)
            ->assertJsonMissingPath('data.data.0.email')->assertJsonMissingPath('data.data.0.user');
        $this->getJson('/api/v2/favorites?type=service')->assertOk()->assertJsonPath('data.data.0.id', $service->id)->assertJsonPath('data.total', 1);
        $this->getJson('/api/v2/favorites/ids')->assertOk()->assertJsonPath('data.business.0', $business->id);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/favorites')->assertOk()->assertJsonPath('data.total', 0);
        $this->deleteJson('/api/v2/favorites/business/'.$business->id)->assertOk();
        $this->assertSame(3, DB::table('people.account_favorites')->count());
        Sanctum::actingAs($user);
        $this->postJson('/api/barber-shops/'.$business->id.'/favorite')->assertOk()->assertJsonPath('is_favorite', false);
        $this->assertSame(2, DB::table('people.account_favorites')->count());
    }

    public function test_archived_targets_cannot_be_saved_but_existing_favorites_can_be_removed(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $business = Business::factory()->create();
        $this->putJson('/api/v2/favorites/business/'.$business->id)->assertOk();
        $business->update(['is_active' => false]);
        $this->getJson('/api/v2/favorites')->assertOk()->assertJsonPath('data.data.0.available', false)->assertJsonPath('data.data.0.url', null);
        $this->putJson('/api/v2/favorites/business/'.$business->id)->assertNotFound();
        $this->deleteJson('/api/v2/favorites/business/'.$business->id)->assertOk();
        $this->putJson('/api/v2/favorites/invalid/1')->assertNotFound();
    }

    public function test_verified_resource_review_has_optional_dimensions_without_a_professional_and_cannot_be_recreated(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $business = Business::factory()->create();
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Court', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id, 'requires_professional' => false]);
        $appointment = Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => today()->format('Y-m-d'), 'start_time' => '10:00', 'end_time' => '10:30',
            'price' => 30000, 'final_price' => 30000, 'status' => 'COMPLETED', 'duration_minutes' => 30]);
        Sanctum::actingAs($user);
        $request = ['appointment_id' => $appointment->id, 'rating' => 5, 'service_rating' => 4, 'business_rating' => 5];
        $this->postJson('/api/v2/reviews', $request + ['professional_rating' => 4])->assertUnprocessable();
        $review = $this->postJson('/api/v2/reviews', $request)->assertCreated()->assertJsonPath('data.is_verified', true)
            ->assertJsonPath('data.service_rating', 4)->assertJsonPath('data.professional_rating', null)->json('data.id');
        $this->putJson('/api/v2/reviews/'.$review, ['service_rating' => 6])->assertUnprocessable();
        $this->putJson('/api/v2/reviews/'.$review, ['professional_rating' => 2])->assertUnprocessable();
        $this->deleteJson('/api/v2/reviews/'.$review)->assertOk();
        $this->postJson('/api/v2/reviews', $request)->assertUnprocessable();
        $this->assertDatabaseHas('reviews.reviews', ['id' => $review, 'is_active' => false]);
    }
}
