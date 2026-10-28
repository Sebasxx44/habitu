<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Ad;
use App\Modules\Marketing\Services\AdMeasurementService;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdGovernanceTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private Business $business;
    private array $payload;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        Http::preventStrayRequests();
        $this->owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $this->business = Business::factory()->create(['owner_user_id' => $this->owner->id]);
        $this->payload = ['business_id' => $this->business->id, 'title' => 'Anuncio', 'placement' => 'HOME', 'start_date' => '2026-10-01', 'end_date' => '2026-11-01', 'budget' => '50000.25'];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function ad(bool $approved = false): Ad
    {
        return Ad::create($this->payload + ['status' => $approved ? 'ACTIVE' : 'PENDING', 'moderation_status' => $approved ? 'APPROVED' : 'PENDING', 'spent' => 0]);
    }

    public function test_new_ads_require_moderation_and_get_does_not_count_unseen_impressions(): void
    {
        Sanctum::actingAs($this->owner);
        $response = $this->postJson('/api/v2/ads', $this->payload)->assertCreated()->assertJsonPath('data.status', 'PENDING');
        $id = $response->json('data.id');
        $this->getJson('/api/v2/ads?placement=HOME')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/v2/ads/'.$id.'/moderate', ['decision' => 'APPROVED'])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->postJson('/api/v2/ads/'.$id.'/moderate', ['decision' => 'APPROVED'])->assertOk();
        $this->getJson('/api/v2/ads?placement=HOME')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.sponsored', true);
        $this->assertSame(0, Ad::findOrFail($id)->impressions_count);
        $this->assertSame('0.00', Ad::findOrFail($id)->spent);
    }

    public function test_edits_reset_moderation_and_pause_resume_delete_are_scoped_and_audited(): void
    {
        $ad = $this->ad(true);
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->putJson('/api/v2/ads/'.$ad->id, $this->payload)->assertForbidden();
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/v2/ads/'.$ad->id.'/status', ['status' => 'PAUSED'])->assertOk();
        $this->getJson('/api/v2/ads?placement=HOME')->assertJsonCount(0, 'data');
        $this->postJson('/api/v2/ads/'.$ad->id.'/status', ['status' => 'ACTIVE'])->assertOk();
        $this->putJson('/api/v2/ads/'.$ad->id, $this->payload + ['description' => 'Texto revisado'])->assertOk()->assertJsonPath('data.moderation_status', 'PENDING');
        $this->postJson('/api/v2/ads/'.$ad->id.'/status', ['status' => 'ACTIVE'])->assertUnprocessable();
        $this->deleteJson('/api/v2/ads/'.$ad->id)->assertOk();
        $this->assertSoftDeleted('marketing.ads', ['id' => $ad->id]);
        $this->assertSame(4, DB::table('marketing.ad_audit_events')->where('ad_id', $ad->id)->count());
    }

    public function test_delivery_token_deduplicates_views_and_clicks_without_charging_budget(): void
    {
        $ad = $this->ad(true);
        $token = $this->getJson('/api/v2/ads?placement=HOME')->assertOk()->json('data.0.delivery_token');
        $this->postJson('/api/v2/ads/'.$ad->id.'/click', ['delivery_token' => $token])->assertUnprocessable();
        foreach ([1, 2] as $attempt) $this->postJson('/api/v2/ads/'.$ad->id.'/impression', ['delivery_token' => $token])->assertOk();
        foreach ([1, 2] as $attempt) $this->postJson('/api/v2/ads/'.$ad->id.'/click', ['delivery_token' => $token])->assertOk();
        $this->assertSame(1, $ad->fresh()->impressions_count);
        $this->assertSame(1, $ad->fresh()->clicks_count);
        $this->assertSame('0.00', $ad->fresh()->spent);
        $this->postJson('/api/v2/ads/'.$ad->id.'/click', ['delivery_token' => (string) Str::uuid()])->assertNotFound();
        $second = app(AdMeasurementService::class)->delivery($ad, null);
        $this->travel(16)->minutes();
        $this->postJson('/api/v2/ads/'.$ad->id.'/impression', ['delivery_token' => $second['delivery_token']])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_spend_and_unapproved_status_cannot_be_supplied_by_advertiser(): void
    {
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/v2/ads', $this->payload + ['spent' => '1', 'status' => 'ACTIVE'])->assertUnprocessable();
        $this->postJson('/api/v2/ads', $this->payload + ['image_url' => 'javascript:alert(1)'])->assertUnprocessable();
        $this->assertSame(0, Ad::count());
    }

    public function test_attribution_requires_server_click_consent_matching_business_and_completion(): void
    {
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendPostServiceSurvey')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar')->andReturn(null));
        $client = User::factory()->create(['role' => 'CLIENTE']);
        DB::table('platform.analytics_preferences')->insert(['user_id' => $client->id, 'measurement' => true, 'personalization' => false, 'created_at' => now(), 'updated_at' => now()]);
        $ad = $this->ad(true);
        $measurement = app(AdMeasurementService::class);
        $delivery = $measurement->delivery($ad, $client->id);
        $measurement->record($ad->id, $delivery['delivery_token'], 'impression', $client->id);
        $measurement->record($ad->id, $delivery['delivery_token'], 'click', $client->id);
        $branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede', 'address' => 'Calle 1', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $this->business->id, 'booking_model' => 'direct', 'requires_professional' => false, 'requires_confirmation' => false]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        $appointment = app(AppointmentService::class)->create(['business_id' => $this->business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_user_id' => $client->id, 'date' => '2026-10-05', 'start_time' => '10:00'])->data;
        $this->assertSame(1, DB::table('marketing.ad_attributions')->count());
        Sanctum::actingAs($this->owner);
        $this->getJson('/api/v2/ads/manage')->assertOk()->assertJsonPath('data.ads.0.completed_attributed_bookings', 0);
        app(AppointmentService::class)->complete($appointment->id);
        $this->getJson('/api/v2/ads/manage')->assertOk()->assertJsonPath('data.ads.0.completed_attributed_bookings', 1);
        DB::table('marketing.ad_attributions')->delete();
        DB::table('marketing.ad_deliveries')->where('id', $delivery['delivery_token'])->update(['clicked_at' => now()->subDays(8)]);
        $measurement->attribute($appointment);
        $this->assertSame(0, DB::table('marketing.ad_attributions')->count());
        DB::table('marketing.ad_deliveries')->where('id', $delivery['delivery_token'])->update(['clicked_at' => now()]);
        $measurement->attribute($appointment);
        $this->assertSame(1, DB::table('marketing.ad_attributions')->count());
        Sanctum::actingAs($client);
        $this->putJson('/api/analytics/preferences', ['measurement' => false, 'personalization' => false])->assertOk();
        $measurement->attribute($appointment);
        $this->assertSame(0, DB::table('marketing.ad_attributions')->count());
        foreach (['marketing.ad_deliveries', 'marketing.ad_impressions', 'marketing.ad_clicks'] as $table) $this->assertSame(0, DB::table($table)->where('user_id', $client->id)->count());
        $this->assertSame(1, $ad->fresh()->clicks_count);
    }

    public function test_delivery_does_not_identify_user_without_measurement_consent(): void
    {
        $client = User::factory()->create(['role' => 'CLIENTE']);
        $ad = $this->ad(true);
        $delivery = app(AdMeasurementService::class)->delivery($ad, $client->id);
        $this->assertNull(DB::table('marketing.ad_deliveries')->where('id', $delivery['delivery_token'])->value('user_id'));
    }
}
