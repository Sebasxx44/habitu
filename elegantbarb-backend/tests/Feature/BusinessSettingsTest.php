<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BusinessSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_persist_hours_location_and_social_links(): void
    {
        $user = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $user->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Principal', 'address' => 'Antes', 'is_main_branch' => true]);
        Sanctum::actingAs($user);
        $hours = ['Lun' => ['active' => true, 'start' => '10:00', 'end' => '18:00']];
        $this->putJson("/api/v2/businesses/{$business->id}", [
            'name' => 'Estudio actualizado', 'address' => 'Calle real', 'lat' => 4.71, 'lng' => -74.07,
            'instagram' => 'https://instagram.com/estudio', 'opening_hours' => json_encode($hours),
        ])->assertOk()->assertJsonPath('data.address', 'Calle real')->assertJsonPath('data.name', 'Estudio actualizado');
        $this->assertDatabaseHas('business.branch_schedules', ['branch_id' => $branch->id, 'day' => 1, 'open_time' => '10:00', 'close_time' => '18:00', 'is_closed' => false]);
        $this->assertDatabaseHas('business.business_social_links', ['business_id' => $business->id, 'platform' => 'instagram', 'url' => 'https://instagram.com/estudio']);
        $this->getJson("/api/v2/businesses/{$business->id}")->assertOk()->assertJsonPath('data.opening_hours', json_encode($hours));
    }

    public function test_foreign_and_invalid_settings_cannot_change_business(): void
    {
        $business = Business::factory()->create();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->putJson("/api/v2/businesses/{$business->id}", ['name' => 'Intruso'])->assertForbidden();
        Sanctum::actingAs(User::findOrFail($business->owner_user_id));
        $business->owner->update(['role' => 'ADMIN_BARBERIA']);
        Sanctum::actingAs($business->owner->fresh());
        $this->putJson("/api/v2/businesses/{$business->id}", ['opening_hours' => '{invalid'])->assertUnprocessable();
        $this->putJson("/api/v2/businesses/{$business->id}", ['opening_hours' => ['Lun' => ['active' => true, 'start' => '19:00', 'end' => '08:00']]])->assertUnprocessable();
        $this->assertDatabaseHas('business.businesses', ['id' => $business->id, 'name' => $business->name]);
    }

    public function test_service_statistics_are_private_and_real_empty_data(): void
    {
        $user = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $user->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson("/api/v2/services/{$service->id}/stats")->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson("/api/v2/services/{$service->id}/stats")->assertForbidden();
        Sanctum::actingAs($user);
        $this->getJson("/api/v2/services/{$service->id}/stats")->assertOk()->assertJsonPath('data.stats.totalAppointments', 0)->assertJsonPath('data.stats.totalRevenue', 0)->assertJsonPath('data.topClients', []);
    }

    public function test_public_slug_only_returns_active_business(): void
    {
        $business = Business::factory()->create(['is_active' => true]);
        $this->getJson("/api/v2/businesses/slug/{$business->slug}")->assertOk()->assertJsonPath('data.id', $business->id);
        $business->update(['is_active' => false]);
        $this->getJson("/api/v2/businesses/slug/{$business->slug}")->assertNotFound();
    }

    public function test_service_creation_validates_real_business_and_persists_category(): void
    {
        $user = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/services', ['business_id' => $business->id, 'name' => 'Corte', 'price' => 30000, 'duration_minutes' => 45, 'category' => 'Estilo'])
            ->assertCreated()->assertJsonPath('data.duration_minutes', 45);
        $this->assertDatabaseHas('catalog.service_categories', ['business_id' => $business->id, 'name' => 'Estilo']);
    }

    public function test_onboarding_persists_resource_mode_and_real_schedule(): void
    {
        $categoryId = Business::factory()->create()->business_category_id;
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $response = $this->postJson('/api/v2/businesses', [
            'business_category_id' => $categoryId, 'name' => 'Espacio', 'address' => 'Calle 20',
            'uses_professionals' => false, 'uses_resources' => true,
            'services' => [['name' => 'Sesión', 'price' => 40000, 'duration' => 60]],
            'resources' => [['name' => 'Sala', 'type' => 'ROOM']],
            'schedule' => ['monday' => ['open' => '09:00', 'close' => '18:00', 'closed' => false]],
        ])->assertCreated()->assertJsonPath('data.uses_professionals', false)->assertJsonPath('data.uses_resources', true)
            ->assertJsonPath('data.services.0.requires_professional', false);
        $this->assertDatabaseHas('business.branch_schedules', ['branch_id' => $response->json('data.branches.0.id'), 'day' => 1, 'open_time' => '09:00']);
    }
    public function test_onboarding_professionals_inherit_the_full_branch_schedule(): void
    {
        $categoryId = Business::factory()->create()->business_category_id;
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $response = $this->postJson('/api/v2/businesses', [
            'business_category_id' => $categoryId, 'name' => 'Jornada completa', 'address' => 'Calle 20',
            'uses_professionals' => true, 'services' => [['name' => 'Sesión', 'price' => 30000, 'duration' => 60]],
            'professionals' => [['name' => 'Profesional']],
            'schedule' => ['monday' => ['open' => '06:00', 'close' => '22:00', 'closed' => false]],
        ])->assertCreated();
        $availability = app(\App\Modules\Booking\Services\AvailabilityService::class)->slots([
            'business_id' => $response->json('data.id'), 'branch_id' => $response->json('data.branches.0.id'),
            'professional_id' => $response->json('data.professionals.0.id'), 'service_id' => $response->json('data.services.0.id'),
            'date' => now(config('booking.timezone'))->addWeek()->next(\Carbon\Carbon::MONDAY)->toDateString(),
        ]);
        $this->assertSame('06:00:00', $availability['slots'][0]['start_time']);
        $this->assertSame('21:00:00', collect($availability['slots'])->last()['start_time']);
        $this->assertTrue($availability['slots'][0]['available']);
    }

    public function test_settings_preserve_legacy_named_weekdays_without_creating_conflicting_schedule(): void
    {
        $user = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $user->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Principal', 'address' => 'Calle 1', 'is_main_branch' => true]);
        $branch->schedules()->create(['day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => false]);
        $original = ['Lun' => ['active' => true, 'start' => '09:00', 'end' => '18:00']];
        $this->getJson('/api/v2/businesses/' . $business->id)->assertOk()->assertJsonPath('data.opening_hours', json_encode($original));
        Sanctum::actingAs($user);
        $changed = ['Lun' => ['active' => true, 'start' => '06:00', 'end' => '22:00']];
        $this->putJson('/api/v2/businesses/' . $business->id, ['opening_hours' => $changed])->assertOk()->assertJsonPath('data.opening_hours', json_encode($changed));
        $this->assertSame(1, $branch->schedules()->count());
        $this->assertDatabaseHas('business.branch_schedules', ['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '06:00', 'close_time' => '22:00']);
        $service = Service::factory()->create(['business_id' => $business->id, 'requires_professional' => false, 'duration_minutes' => 60]);
        $slots = app(\App\Modules\Booking\Services\AvailabilityService::class)->slots([
            'business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'date' => now(config('booking.timezone'))->addWeek()->next(\Carbon\Carbon::MONDAY)->toDateString(),
        ]);
        $this->assertSame('06:00:00', $slots['slots'][0]['start_time']);
    }

}
