<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\BusinessCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ExternalBusinessListingTest extends TestCase
{
    use RefreshDatabase;

    private function externalPayload(): array
    {
        $category = BusinessCategory::firstOrCreate(['slug' => 'veterinaria'], [
            'name' => 'Veterinaria', 'description' => 'Clínicas y servicios veterinarios', 'icon' => 'PawPrint', 'is_active' => true,
        ]);
        return ['business_category_id' => $category->id, 'name' => 'Clínica con agenda oficial', 'slug' => 'clinica-externa',
            'address' => 'Dirección pública verificada', 'description' => 'Referencia pública sin afiliación comercial.',
            'booking_mode' => 'external', 'booking_url' => 'https://agenda.example.test/clinica',
            'listing_source_url' => 'https://clinica.example.test/contacto'];
    }

    public function test_curator_creates_external_listing_without_fabricating_owner_staff_services_or_slots(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $users = User::count();
        $created = $this->postJson('/api/v2/businesses', $this->externalPayload())->assertCreated()
            ->assertJsonPath('data.owner_user_id', null)->assertJsonPath('data.booking_mode', 'external')
            ->assertJsonPath('data.rating', '0.0')->assertJsonPath('data.verified', false)
            ->assertJsonCount(0, 'data.services')->assertJsonCount(0, 'data.professionals');
        $id = $created->json('data.id');
        $this->getJson('/api/v2/public/businesses/'.$id)->assertOk()
            ->assertJsonPath('data.booking_url', 'https://agenda.example.test/clinica')
            ->assertJsonPath('data.listing_source_url', 'https://clinica.example.test/contacto')
            ->assertJsonPath('data.price_from', null)->assertJsonPath('data.next_available', null)
            ->assertJsonCount(0, 'data.services')->assertJsonCount(0, 'data.professionals');
        $this->assertSame($users, User::count());
        $this->assertDatabaseCount('business.branch_schedules', 0);
        $this->assertDatabaseCount('people.professional_availability', 0);
    }

    public function test_external_listing_is_discoverable_without_services_but_never_matches_unknown_inventory_filters(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $id = $this->postJson('/api/v2/businesses', $this->externalPayload())->assertCreated()->json('data.id');
        $this->getJson('/api/v2/businesses/search?per_page=12&q=veterinaria')->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.id', $id)
            ->assertJsonPath('data.data.0.booking_mode', 'external')->assertJsonPath('data.data.0.price_from', null)
            ->assertJsonPath('data.data.0.next_available', null)->assertJsonCount(0, 'data.data.0.services');
        foreach (['min_price=0', 'max_price=100000', 'date=2030-01-01', 'available=1', 'duration_minutes=30', 'participants=2', 'booking_model=professional'] as $filter) {
            $this->getJson('/api/v2/businesses/search?per_page=12&'.$filter)->assertOk()->assertJsonPath('data.total', 0);
        }
        $this->getJson('/api/v2/businesses/search?per_page=12&q=clinicas')->assertOk()->assertJsonPath('data.total', 1);
    }

    public function test_invalid_external_urls_operational_data_and_unapproved_publication_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $payload = $this->externalPayload();
        foreach (['http://agenda.example.test', 'https://user:password@agenda.example.test', 'javascript:alert(1)'] as $url) {
            $this->postJson('/api/v2/businesses', array_replace($payload, ['booking_url' => $url]))
                ->assertUnprocessable()->assertJsonValidationErrors('booking_url');
        }
        foreach (['booking_url', 'listing_source_url'] as $field) {
            $this->postJson('/api/v2/businesses', array_replace($payload, [$field => null]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->postJson('/api/v2/businesses', $payload + ['services' => [['name' => 'Inventado', 'price' => 1, 'duration' => 30]]])
            ->assertUnprocessable()->assertJsonValidationErrors('services');
        $paused = $this->postJson('/api/v2/businesses', array_replace($payload, ['is_active' => false, 'booking_url' => null]))
            ->assertCreated()->json('data.id');
        $this->putJson('/api/v2/businesses/'.$paused, ['is_active' => true])->assertUnprocessable()->assertJsonValidationErrors('booking_url');
        $this->putJson('/api/v2/businesses/'.$paused, ['booking_mode' => 'internal'])
            ->assertUnprocessable()->assertJsonValidationErrors('booking_mode');
    }

    public function test_regular_admin_cannot_claim_an_external_listing_or_set_curated_booking_metadata(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->postJson('/api/v2/businesses', $this->externalPayload())->assertForbidden();
        $this->assertDatabaseCount('business.businesses', 0);
    }

    public function test_all_internal_booking_entrypoints_reject_external_listings_even_if_legacy_verified_is_true(): void
    {
        $external = Business::factory()->create(['booking_mode' => 'external', 'owner_user_id' => null,
            'booking_url' => 'https://agenda.example.test/clinica', 'listing_source_url' => 'https://clinica.example.test', 'verified' => true]);
        $branch = BusinessBranch::create(['business_id' => $external->id, 'name' => 'Ubicación pública', 'address' => 'Dirección pública']);
        $service = Service::factory()->create(['business_id' => $external->id]);
        $this->getJson('/api/v2/public/businesses/'.$external->id)->assertOk()->assertJsonPath('data.verified', false);
        $request = ['business_id' => $external->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'date' => '2030-01-01', 'start_time' => '10:00'];
        $this->getJson('/api/v2/public/availability?'.http_build_query($request))->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->getJson('/api/v2/public/availability?'.http_build_query(array_replace($request, ['service_id' => 999999, 'date' => '2000-01-01'])))
            ->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $user = User::factory()->create(['role' => User::ROLE_CLIENT]);
        Client::factory()->create(['user_id' => $user->id]);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/appointments/availability?'.http_build_query($request))->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->postJson('/api/v2/appointments/quote', $request)->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->postJson('/api/v2/appointments', $request)->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->postJson('/api/v2/booking/checkout', $request + ['payment_mode' => 'ON_SITE', 'accepted_terms' => true,
            'expected_policy_version' => 1, 'expected_total' => 30000, 'idempotency_key' => (string) Str::uuid()])
            ->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->getJson('/api/v2/booking/checkout/policy?business_id='.$external->id)->assertUnprocessable()->assertJsonValidationErrors('business_id');
        $this->assertSame(0, Appointment::count());
        $this->assertDatabaseCount('finance.checkout_orders', 0);
        $this->assertDatabaseCount('booking.appointment_events', 0);
    }

    public function test_additive_migration_preserves_custom_categories_and_initializes_veterinary_care(): void
    {
        $migration = require database_path('migrations/2026_10_28_000003_add_external_business_listings.php');
        $migration->down();
        $category = BusinessCategory::create(['slug' => 'barberia', 'name' => 'Categoría editada', 'is_active' => false]);
        $migration->up();
        $this->assertDatabaseHas('platform.business_categories', ['id' => $category->id, 'name' => 'Categoría editada', 'is_active' => false]);
        $this->assertDatabaseHas('platform.business_categories', ['slug' => 'veterinaria', 'name' => 'Veterinaria', 'is_active' => true]);
        $vet = BusinessCategory::where('slug', 'veterinaria')->firstOrFail();
        $vet->update(['name' => 'Veterinaria propia', 'is_active' => false]);
        $migration->down();
        $migration->up();
        $this->assertDatabaseHas('platform.business_categories', ['id' => $vet->id, 'name' => 'Veterinaria propia', 'is_active' => false]);
    }
}
