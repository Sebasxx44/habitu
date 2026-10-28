<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Models\Resource;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Reviews\Models\Review;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class PublicCatalogAccessTest extends TestCase
{
    use RefreshDatabase;

    private Business $business;
    private BusinessBranch $branch;
    private Service $service;
    private Professional $professional;
    private array $availability;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->business = Business::factory()->create(['name' => 'Negocio público', 'slug' => 'negocio-publico',
            'tax_id' => 'private-tax', 'is_active' => true, 'uses_professionals' => false, 'uses_resources' => false]);
        $this->branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede pública',
            'address' => 'Dirección del local', 'is_active' => true, 'is_main_branch' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $this->branch->id, 'day' => 'MONDAY',
            'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => false]);
        $this->service = Service::factory()->create(['business_id' => $this->business->id, 'name' => 'Servicio público',
            'requires_professional' => false, 'booking_model' => 'direct', 'duration_minutes' => 60,
            'price' => 25000, 'is_active' => true]);
        $this->professional = Professional::create(['business_id' => $this->business->id, 'name' => 'Perfil público',
            'email' => 'private@example.test', 'phone' => 'private-phone', 'identification_number' => 'private-id',
            'address' => 'Domicilio privado', 'birthday' => '1990-01-01', 'commission_percentage' => 35, 'is_active' => true]);
        $this->service->professionals()->attach($this->professional->id, ['branch_id' => $this->branch->id,
            'commission_percentage' => 45, 'is_active' => true]);
        $this->availability = ['business_id' => $this->business->id, 'branch_id' => $this->branch->id,
            'service_id' => $this->service->id, 'date' => '2026-10-05'];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_guest_can_browse_complete_public_profile_without_private_identities_or_commissions(): void
    {
        $client = Client::factory()->create(['name' => 'Nombre privado del cliente']);
        Review::create(['business_id' => $this->business->id, 'client_id' => $client->id,
            'rating' => 5, 'comment' => 'Comentario publicado', 'is_active' => true, 'is_verified' => true]);
        $response = $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()
            ->assertJsonPath('data.services.0.id', $this->service->id)
            ->assertJsonPath('data.services.0.professionals.0.id', $this->professional->id)
            ->assertJsonPath('data.services.0.professionals.0.branch_ids.0', $this->branch->id)
            ->assertJsonPath('data.professionals.0.id', $this->professional->id)
            ->assertJsonPath('data.branches.0.schedules.0.open_time', '09:00')
            ->assertJsonPath('data.reviews.0.comment', 'Comentario publicado')
            ->assertJsonMissingPath('data.tax_id')->assertJsonMissingPath('data.owner_user_id')
            ->assertJsonMissingPath('data.professionals.0.email')->assertJsonMissingPath('data.professionals.0.phone')
            ->assertJsonMissingPath('data.professionals.0.identification_number')
            ->assertJsonMissingPath('data.services.0.professionals.0.pivot')
            ->assertJsonMissingPath('data.services.0.professionals.0.commission_percentage')
            ->assertJsonMissingPath('data.reviews.0.client_id')->assertJsonMissingPath('data.reviews.0.appointment_id')
            ->assertJsonMissingPath('data.reviews.0.client');
        $this->assertStringNotContainsString('Nombre privado del cliente', $response->getContent());
        $this->getJson('/api/v2/public/businesses/slug/'.$this->business->slug)->assertOk()
            ->assertJsonPath('data.id', $this->business->id)->assertJsonMissingPath('data.tax_id');
    }

    public function test_public_profiles_hide_inactive_and_deleted_entries_and_internal_resource_attributes(): void
    {
        Service::factory()->create(['business_id' => $this->business->id, 'is_active' => false]);
        Service::factory()->create(['business_id' => $this->business->id])->delete();
        Professional::create(['business_id' => $this->business->id, 'name' => 'Inactivo', 'is_active' => false]);
        BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Cerrada', 'address' => 'Dirección oculta', 'is_active' => false]);
        $resource = Resource::create(['business_id' => $this->business->id, 'branch_id' => $this->branch->id,
            'name' => 'Cancha', 'type' => 'COURT', 'is_active' => true,
            'attributes' => ['surface' => 'synthetic', 'private_access_code' => 'private-code']]);
        $this->service->resources()->attach($resource->id, ['is_active' => true]);
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()
            ->assertJsonCount(1, 'data.services')->assertJsonCount(1, 'data.professionals')->assertJsonCount(1, 'data.branches')
            ->assertJsonPath('data.resources.0.attributes.surface', 'synthetic')
            ->assertJsonMissingPath('data.resources.0.attributes.private_access_code');
        $this->business->update(['is_active' => false]);
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertNotFound();
        $this->getJson('/api/v2/public/businesses/slug/'.$this->business->slug)->assertNotFound();
    }

    public function test_legacy_services_without_links_expose_the_same_professionals_as_the_booking_engine(): void
    {
        $this->service->professionals()->detach();
        $this->service->update(['booking_model' => 'professional', 'requires_professional' => true]);
        $this->business->update(['uses_professionals' => true]);
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()
            ->assertJsonPath('data.services.0.professionals.0.id', $this->professional->id)
            ->assertJsonPath('data.services.0.professionals.0.branch_ids.0', $this->branch->id)
            ->assertJsonMissingPath('data.services.0.professionals.0.email')
            ->assertJsonMissingPath('data.services.0.professionals.0.commission_percentage');
        $response = $this->getJson('/api/v2/public/availability?'.http_build_query($this->availability + ['professional_id' => $this->professional->id]))->assertOk();
        $this->assertTrue(collect($response->json('data.slots'))->contains(fn (array $slot): bool => $slot['available']));
        $this->assertDatabaseCount('catalog.professional_services', 0);
    }

    public function test_disabled_explicit_professional_links_never_enable_the_legacy_fallback(): void
    {
        $this->service->update(['booking_model' => 'professional', 'requires_professional' => true]);
        $this->service->professionals()->updateExistingPivot($this->professional->id, ['is_active' => false]);
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()
            ->assertJsonCount(0, 'data.services.0.professionals');
        $this->getJson('/api/v2/public/availability?'.http_build_query($this->availability + ['professional_id' => $this->professional->id]))
            ->assertUnprocessable()->assertJsonValidationErrors('professional_id');
    }

    public function test_legacy_professionals_respect_real_available_branches_without_creating_bindings(): void
    {
        $this->service->professionals()->detach();
        $this->service->update(['booking_model' => 'professional', 'requires_professional' => true]);
        $otherBranch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Otra sede', 'address' => 'Otra dirección', 'is_active' => true]);
        $this->professional->availability()->create(['branch_id' => $otherBranch->id, 'day_of_week' => 1,
            'start_time' => '09:00', 'end_time' => '18:00', 'is_available' => true]);
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()
            ->assertJsonPath('data.services.0.professionals.0.branch_ids', [$otherBranch->id]);
        $this->assertDatabaseCount('catalog.professional_services', 0);
    }

    public function test_legacy_public_business_routes_cannot_expose_inactive_businesses_or_management_fields(): void
    {
        $inactive = Business::factory()->create(['is_active' => false, 'tax_id' => 'inactive-private-tax']);
        $this->getJson('/api/v2/businesses')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonMissingPath('data.0.tax_id')->assertJsonMissingPath('data.0.owner_user_id');
        $this->getJson('/api/v2/businesses?active=false')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v2/businesses/'.$inactive->id)->assertNotFound();
        $this->getJson('/api/v2/businesses/'.$this->business->id)->assertOk()->assertJsonMissingPath('data.tax_id');
    }

    public function test_real_admin_token_preserves_management_access_and_role_while_public_profile_stays_public(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->business->update(['owner_user_id' => $admin->id]);
        $token = $admin->createToken('actual-admin')->plainTextToken;
        $this->withToken($token)->getJson('/api/v2/businesses/'.$this->business->id)->assertOk()
            ->assertJsonPath('data.tax_id', 'private-tax');
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertOk()->assertJsonMissingPath('data.tax_id');
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.role', User::ROLE_ADMIN);
        $this->assertSame(User::ROLE_ADMIN, $admin->fresh()->role);
        $this->business->update(['is_active' => false]);
        $this->getJson('/api/v2/businesses/'.$this->business->id)->assertOk();
        $this->getJson('/api/v2/public/businesses/'.$this->business->id)->assertNotFound();
    }

    public function test_authenticated_foreign_admin_only_sees_the_public_business_projection(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $this->withToken($admin->createToken('foreign-admin')->plainTextToken)->getJson('/api/v2/businesses/'.$this->business->id)
            ->assertOk()->assertJsonMissingPath('data.tax_id')->assertJsonMissingPath('data.owner_user_id');
    }

    public function test_guest_availability_uses_real_inventory_without_exposing_customer_or_appointment_ids(): void
    {
        $client = Client::factory()->create();
        Appointment::create(['business_id' => $this->business->id, 'branch_id' => $this->branch->id,
            'service_id' => $this->service->id, 'client_id' => $client->id, 'date' => '2026-10-05',
            'start_time' => '10:00', 'end_time' => '11:00', 'price' => 25000, 'final_price' => 25000,
            'status' => 'CONFIRMED', 'duration_minutes' => 60]);
        $users = User::count();
        $response = $this->getJson('/api/v2/public/availability?'.http_build_query($this->availability))->assertOk();
        $slots = collect($response->json('data.slots'));
        $this->assertTrue($slots->firstWhere('start_time', '09:00:00')['available']);
        $this->assertFalse($slots->firstWhere('start_time', '10:00:00')['available']);
        $this->assertStringNotContainsString('client_id', $response->getContent());
        $this->assertStringNotContainsString('appointment_id', $response->getContent());
        $this->assertSame(1, Appointment::count());
        $this->assertSame($users, User::count());
    }

    public function test_guest_cannot_exclude_existing_reservations_or_request_personal_availability(): void
    {
        foreach (['appointment_id', 'client_id', 'client_user_id'] as $field) {
            $this->getJson('/api/v2/public/availability?'.http_build_query($this->availability + [$field => 1]))
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $foreign = BusinessBranch::create(['business_id' => Business::factory()->create()->id, 'name' => 'Ajena', 'address' => 'Ajena']);
        $this->getJson('/api/v2/public/availability?'.http_build_query(array_replace($this->availability, ['branch_id' => $foreign->id])))
            ->assertUnprocessable();
    }

    public function test_guest_cannot_mutate_catalog_create_reservations_or_read_personal_data(): void
    {
        foreach (['/api/v2/appointments', '/api/v2/appointments/quote', '/api/v2/booking/checkout', '/api/v2/services', '/api/v2/reviews'] as $uri) {
            $this->postJson($uri, [])->assertUnauthorized();
        }
        foreach (['/api/v2/appointments', '/api/v2/appointments/availability', '/api/v2/booking/checkout/policy',
            '/api/v2/favorites', '/api/auth/me'] as $uri) {
            $this->getJson($uri)->assertUnauthorized();
        }
    }
}
