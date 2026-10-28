<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class MarketplaceAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_requires_ownership_role_permission_and_bounded_dates(): void
    {
        $business = Business::factory()->create();
        $url = '/api/analytics/businesses/'.$business->id;
        $this->getJson($url)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson($url)->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson($url)->assertForbidden();
        $this->getJson('/api/analytics/platform')->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson($url.'?start_date=2024-01-01&end_date=2026-01-01')->assertUnprocessable();
        $this->getJson($url.'?start_date=2026-01-01')->assertUnprocessable();
        $this->getJson($url.'?currency=invalid')->assertUnprocessable();
    }

    public function test_business_metrics_aggregate_full_period_separate_currencies_and_include_unbooked_services(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(18, 0));
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id, 'uses_professionals' => false, 'uses_resources' => true]);
        $service = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'resource']);
        $unbooked = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'resource']);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $this->appointment($business, $service, $client, ['date' => '2026-09-28', 'final_price' => 50]);
        $completed = $this->appointment($business, $service, $client, ['final_price' => 100]);
        $this->appointment($business, $service, $client, ['final_price' => 9, 'currency' => 'USD']);
        $this->appointment($business, $service, $client, ['status' => 'CANCELLED', 'final_price' => 200]);
        $foreign = Business::factory()->create();
        $this->appointment($foreign, Service::factory()->create(['business_id' => $foreign->id]), Client::factory()->create(['business_id' => $foreign->id]), ['final_price' => 999]);
        DB::table('finance.payments')->insert(['business_id' => $business->id, 'appointment_id' => $completed->id, 'client_id' => $client->id, 'amount' => 40, 'currency' => 'COP', 'method' => 'CASH', 'status' => 'COMPLETED']);
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/analytics/businesses/'.$business->id.'?start_date=2026-10-01&end_date=2026-10-03&grain=day');
        $response->assertOk()->assertJsonPath('scope.professionals', false)->assertJsonPath('scope.resources', true)->assertJsonPath('telemetry.available', false);
        $metrics = collect($response->json('metrics'))->keyBy('id');
        $this->assertEquals(3, $metrics['reservations']['value']);
        $this->assertEquals(100, $metrics['realizedValue']['value']);
        $this->assertEquals(40, $metrics['payments']['value']);
        $this->assertEquals(1, $metrics['returningClients']['value']);
        $this->assertEquals(100, $metrics['retention']['value']);
        $this->assertEquals('10:00', $response->json('branches.0.hours.0.id'));
        $this->assertEquals($service->id, $response->json('branches.0.services.0.id'));
        $this->assertNull($metrics['occupancy']['value']);
        $this->assertEquals(0, collect($response->json('services'))->firstWhere('id', $unbooked->id)['reservations']);
        $this->assertEquals(3, count($response->json('series')));
        $this->getJson('/api/analytics/businesses/'.$business->id.'?start_date=2026-10-01&end_date=2026-10-03&currency=USD')->assertOk()->assertJsonPath('metrics.1.value', 9);
    }

    public function test_measurement_is_opt_in_idempotent_validates_booking_ownership_and_discards_sensitive_content(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($user);
        $event = ['event_id' => (string) Str::uuid(), 'session_id' => (string) Str::uuid(), 'event' => 'visit', 'source' => 'marketplace'];
        $this->postJson('/api/analytics/events', $event)->assertAccepted()->assertJsonPath('accepted', false);
        $this->assertDatabaseCount('platform.marketplace_events', 0);
        $this->putJson('/api/analytics/preferences', ['measurement' => true, 'personalization' => false])->assertOk();
        $this->postJson('/api/analytics/events', $event)->assertAccepted()->assertJsonPath('accepted', true);
        $this->postJson('/api/analytics/events', $event)->assertAccepted();
        $this->assertDatabaseCount('platform.marketplace_events', 1);
        $this->postJson('/api/analytics/events', [...$event, 'event_id' => (string) Str::uuid(), 'message' => 'private text'])->assertUnprocessable();
        $business = Business::factory()->create();
        $appointment = $this->appointment($business, Service::factory()->create(['business_id' => $business->id]), Client::factory()->create(['business_id' => $business->id]));
        $this->postJson('/api/analytics/events', [...$event, 'event_id' => (string) Str::uuid(), 'event' => 'booking_confirmed', 'appointment_id' => $appointment->id])->assertNotFound();
        $owned = $this->appointment($business, Service::factory()->create(['business_id' => $business->id]), Client::factory()->create(['business_id' => $business->id, 'user_id' => $user->id]));
        foreach (range(1, 2) as $attempt) $this->postJson('/api/analytics/events', [...$event, 'event_id' => (string) Str::uuid(), 'event' => 'booking_confirmed', 'appointment_id' => $owned->id])->assertAccepted();
        $this->assertDatabaseCount('platform.marketplace_events', 2);
        $this->putJson('/api/analytics/preferences', ['measurement' => false, 'personalization' => false])->assertOk();
        $this->assertDatabaseCount('platform.marketplace_events', 0);
    }

    public function test_funnel_uses_ordered_sessions_and_suppresses_small_groups(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(18, 0));
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/platform?days=7')->assertOk()->assertJsonPath('telemetry.available', false)->assertJsonPath('telemetry.funnel.0.sessions', null)->assertJsonPath('platform.demographics.available', false);
        foreach (range(1, 5) as $person) {
            $session = (string) Str::uuid();
            foreach (['visit', 'search', 'business_view'] as $offset => $event) DB::table('platform.marketplace_events')->insert([
                'event_id' => (string) Str::uuid(), 'session_id' => $session, 'actor_hash' => hash('sha256', (string) $person), 'event' => $event, 'source' => 'marketplace', 'created_at' => now()->subMinutes(10 - $offset),
            ]);
        }
        $this->getJson('/api/analytics/platform?days=7')->assertOk()->assertJsonPath('telemetry.available', true)->assertJsonPath('telemetry.funnel.0.sessions', 5)->assertJsonPath('telemetry.funnel.1.rate', 100)->assertJsonPath('telemetry.funnel.3.sessions', 0);
    }

    public function test_geography_suppresses_small_groups_and_counts_real_unique_clients(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(18, 0));
        $country = DB::table('public.countries')->insertGetId(['name' => 'País de prueba', 'code' => 'QA']);
        $city = DB::table('public.cities')->insertGetId(['name' => 'Ciudad de prueba', 'country_id' => $country, 'lat' => 0, 'lng' => 0]);
        $business = Business::factory()->create();
        $service = Service::factory()->create(['business_id' => $business->id]);
        foreach (range(1, 4) as $index) {
            $appointment = $this->appointment($business, $service, Client::factory()->create(['business_id' => $business->id]));
            BusinessBranch::whereKey($appointment->branch_id)->update(['city_id' => $city]);
        }
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/platform?days=7')->assertOk()->assertJsonPath('platform.geography.cities', [])->assertJsonPath('platform.geography.countries', []);
        $appointment = $this->appointment($business, $service, Client::factory()->create(['business_id' => $business->id]));
        BusinessBranch::whereKey($appointment->branch_id)->update(['city_id' => $city]);
        $this->getJson('/api/analytics/platform?days=7')->assertOk()->assertJsonPath('platform.geography.cities.0.clients', 5)->assertJsonPath('platform.geography.cities.0.reservations', 5)->assertJsonPath('platform.geography.countries.0.businesses', 1);
    }

    public function test_existing_installations_without_geography_catalog_keep_analytics_available(): void
    {
        Schema::rename('public.cities', 'cities_not_available');
        try {
            Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
            $response = $this->getJson('/api/analytics/platform?days=7')->assertOk()->assertJsonPath('platform.geography.precision', 'unavailable')->assertJsonPath('platform.geography.cities', []);
            $this->assertNull(collect($response->json('platform.metrics'))->firstWhere('id', 'activeCities')['value']);
        } finally {
            Schema::rename('public.cities_not_available', 'cities');
        }
    }

    public function test_service_conversion_orders_events_and_measures_assistant_without_message_content(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(18, 0));
        $business = Business::factory()->create();
        $service = Service::factory()->create(['business_id' => $business->id]);
        foreach (range(1, 5) as $person) {
            $session = (string) Str::uuid();
            foreach (['assistant_conversation', 'assistant_search', 'assistant_recommendations', 'service_view', 'booking_confirmed'] as $offset => $event) DB::table('platform.marketplace_events')->insert([
                'event_id' => (string) Str::uuid(), 'session_id' => $session, 'actor_hash' => hash('sha256', (string) $person), 'event' => $event, 'source' => 'assistant', 'service_id' => $service->id, 'business_id' => $business->id, 'results_count' => $event === 'assistant_recommendations' ? 2 : 0,
                'created_at' => now()->subMinutes($person === 5 && $event === 'booking_confirmed' ? 11 : 10 - $offset),
            ]);
        }
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $response = $this->getJson('/api/analytics/platform?days=7')->assertOk()
            ->assertJsonPath('telemetry.assistantAvailable', true)->assertJsonPath('telemetry.assistant.0.value', 5)->assertJsonPath('telemetry.assistant.2.value', 10)
            ->assertJsonPath('telemetry.searchedServices.0.value', 5)->assertJsonPath('telemetry.serviceConversion.0.rate', 80)
            ->assertJsonPath('telemetry.serviceConversion.0.bookings', 4)->assertJsonPath('telemetry.conversion', null);
    }

    public function test_professional_breakdown_uses_verified_reviews_and_real_bookings(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(18, 0));
        $business = Business::factory()->create();
        $service = Service::factory()->create(['business_id' => $business->id]);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $professional = \App\Modules\People\Models\Professional::create(['business_id' => $business->id, 'name' => 'Profesional de prueba']);
        $appointment = $this->appointment($business, $service, $client, ['professional_id' => $professional->id]);
        DB::table('reviews.reviews')->insert(['business_id' => $business->id, 'client_id' => $client->id, 'appointment_id' => $appointment->id, 'professional_id' => $professional->id, 'rating' => 3, 'professional_rating' => 5, 'is_verified' => true, 'is_active' => true]);
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/businesses/'.$business->id.'?days=7')->assertOk()->assertJsonPath('professionals.0.rating', 5)
            ->assertJsonPath('professionals.0.ratingCount', 1)->assertJsonPath('professionals.0.services.0.reservations', 1)
            ->assertJsonPath('professionals.0.hours.0.id', '10:00')->assertJsonPath('professionals.0.occupancy', null);
    }

    private function appointment(Business $business, Service $service, Client $client, array $attributes = []): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Prueba']);
        return Appointment::create([...['business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id, 'service_id' => $service->id,
            'date' => '2026-10-03', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'COMPLETED', 'payment_status' => 'PENDING', 'price' => 100, 'final_price' => 100, 'currency' => 'COP'], ...$attributes]);
    }
}
