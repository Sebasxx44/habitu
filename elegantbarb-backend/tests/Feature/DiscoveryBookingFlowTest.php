<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DiscoveryBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    private Business $business;
    private BusinessBranch $branch;
    private Service $service;
    private Professional $professional;
    private User $customer;
    private array $requestData;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendCancellationNotification', 'sendPostServiceSurvey')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar', 'deleteCalendarEvent')->andReturn(null));
        $this->business = Business::factory()->create(['name' => 'Estudio del Río', 'is_active' => true, 'uses_resources' => false]);
        $this->branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Centro', 'address' => 'Pereira, Circunvalar', 'lat' => 4.81, 'lng' => -75.69, 'is_main_branch' => true, 'is_active' => true]);
        $this->service = Service::factory()->create(['business_id' => $this->business->id, 'name' => 'Manicure y uñas', 'price' => 45000, 'duration_minutes' => 45, 'buffer_minutes' => 15]);
        $this->professional = Professional::create(['business_id' => $this->business->id, 'name' => 'Mariana', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $this->branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        DB::table('catalog.professional_services')->insert(['professional_id' => $this->professional->id, 'service_id' => $this->service->id, 'branch_id' => $this->branch->id, 'is_active' => true]);
        $this->customer = User::factory()->create(['role' => 'CLIENTE']);
        Client::factory()->create(['user_id' => $this->customer->id]);
        Sanctum::actingAs($this->customer);
        $this->requestData = ['business_id' => $this->business->id, 'branch_id' => $this->branch->id, 'service_id' => $this->service->id, 'date' => '2026-10-05', 'start_time' => '10:00'];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_search_matches_service_professional_address_and_paginates_without_fake_rating(): void
    {
        foreach (['unas', 'Mariana', 'Pereira'] as $term) {
            $this->getJson('/api/v2/businesses/search?per_page=1&q='.urlencode($term))->assertOk()
                ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.price_from', 45000)
                ->assertJsonPath('data.data.0.rating', null)->assertJsonPath('data.data.0.next_available.date', '2026-10-05');
        }
        $this->getJson('/api/v2/businesses/search?per_page=1&max_price=10000')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/v2/businesses/search?per_page=1&min_rating=4')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/v2/businesses/search?q=unas')->assertOk()->assertJsonPath('data.0.id', $this->business->id);
        $this->getJson('/api/v2/businesses/suggestions?q=unas')->assertOk()->assertJsonPath('data.0.type', 'service');
        $this->getJson('/api/v2/businesses/search?per_page=1&lat=4.81&lng=-75.69&radius=1&sort=distance')->assertOk()->assertJsonPath('data.total', 1);
    }

    public function test_date_range_availability_filter_counts_only_real_bookable_businesses(): void
    {
        $this->getJson('/api/v2/businesses/search?per_page=12&available=1&date=2026-10-04')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/v2/businesses/search?per_page=12&available=1&date=2026-10-04&date_to=2026-10-05')->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.next_available.branch_id', $this->branch->id);
        $this->getJson('/api/v2/businesses/search?date=2026-10-04&date_to=2026-10-20')->assertUnprocessable();
    }

    public function test_any_professional_quote_and_create_are_server_priced_atomic_and_idempotent(): void
    {
        $promotion = $this->promotion();
        $slots = $this->getJson('/api/v2/appointments/availability?'.http_build_query($this->requestData))->assertOk();
        $this->assertSame($this->professional->id, $slots->json('data.slots.0.professional_id'));
        $payload = $this->requestData + ['promo_code' => $promotion->promo_code, 'idempotency_key' => (string) Str::uuid(), 'price' => 1];
        $this->postJson('/api/v2/appointments/quote', $payload)->assertOk()->assertJsonPath('data.subtotal', 45000)->assertJsonPath('data.discount', 4500)->assertJsonPath('data.total', 40500);
        $first = $this->postJson('/api/v2/appointments', $payload)->assertCreated()->assertJsonPath('data.final_price', '40500.00');
        $id = $first->json('data.id');
        $this->postJson('/api/v2/appointments', $payload)->assertOk()->assertJsonPath('data.id', $id);
        $this->assertSame(1, Appointment::count());
        $this->assertSame(1, DB::table('marketing.promotion_redemptions')->count());
        $this->assertSame(1, $promotion->fresh()->usage_count);
        $this->getJson('/api/v2/appointments?view=upcoming&per_page=12')->assertOk()->assertJsonPath('data.total', 1);
        $this->postJson('/api/v2/appointments', array_replace($payload, ['idempotency_key' => (string) Str::uuid()]))->assertUnprocessable();
    }

    public function test_promotion_restrictions_are_revalidated_at_confirmation(): void
    {
        $promotion = $this->promotion();
        $this->postJson('/api/v2/appointments/quote', $this->requestData + ['promo_code' => $promotion->promo_code])->assertOk();
        $promotion->update(['usage_count' => 1, 'usage_limit' => 1]);
        $this->postJson('/api/v2/appointments', $this->requestData + ['promo_code' => $promotion->promo_code])->assertUnprocessable();
        $this->assertSame(0, Appointment::count());
        $promotion->update(['usage_count' => 0, 'min_purchase' => 50000]);
        $this->postJson('/api/v2/appointments/quote', $this->requestData + ['promo_code' => $promotion->promo_code])->assertUnprocessable();
    }

    public function test_appointment_lists_do_not_repeat_embedded_media_and_detail_preserves_it(): void
    {
        $image = 'data:image/png;base64,'.str_repeat('A', 262144);
        $this->business->update(['logo_url' => $image, 'banner_url' => $image]);
        $this->professional->update(['photo_url' => $image]);
        $id = $this->postJson('/api/v2/appointments', $this->requestData)->assertCreated()->json('data.id');

        $list = $this->getJson('/api/v2/appointments')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.business.logo_url', null)
            ->assertJsonPath('data.0.business.banner_url', null)
            ->assertJsonPath('data.0.professional.photo_url', null);
        $this->assertLessThan(12000, strlen($list->getContent()));
        $this->getJson('/api/v2/appointments?per_page=12')->assertOk()
            ->assertJsonPath('data.data.0.business.banner_url', null);
        $this->getJson('/api/v2/appointments/'.$id)->assertOk()
            ->assertJsonPath('data.business.logo_url', $image)
            ->assertJsonPath('data.business.banner_url', $image)
            ->assertJsonPath('data.professional.photo_url', $image);

        $imageUrl = 'https://example.test/business-banner.png';
        $this->business->update(['banner_url' => $imageUrl]);
        $this->getJson('/api/v2/appointments')->assertOk()->assertJsonPath('data.0.business.banner_url', $imageUrl);
    }

    public function test_detail_timeline_and_actions_are_owned_and_reschedule_uses_real_availability(): void
    {
        $id = $this->postJson('/api/v2/appointments', $this->requestData)->assertCreated()->json('data.id');
        $this->getJson('/api/v2/appointments/'.$id)->assertOk()->assertJsonPath('data.timeline.0.type', 'created')
            ->assertJsonPath('data.allowed_actions.reschedule', true)->assertJsonMissingPath('data.professional.email');
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule', ['date' => '2026-10-05', 'start_time' => '12:00'])->assertOk();
        $this->getJson('/api/v2/appointments/'.$id)->assertOk()->assertJsonCount(2, 'data.timeline');
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/appointments/'.$id)->assertForbidden();
    }

    public function test_branch_price_and_professional_eligibility_are_consistent_in_discovery_and_booking(): void
    {
        DB::table('catalog.branch_services')->insert(['service_id' => $this->service->id, 'branch_id' => $this->branch->id, 'is_active' => true, 'price_override' => 60000]);
        $this->getJson('/api/v2/businesses/search?per_page=12&max_price=50000')->assertOk()->assertJsonPath('data.total', 0);
        $this->getJson('/api/v2/businesses/search?per_page=12&min_price=50000&max_price=65000')->assertOk()
            ->assertJsonPath('data.data.0.price_from', 60000)->assertJsonPath('data.data.0.service_previews.0.price', 60000);
        $this->postJson('/api/v2/appointments/quote', $this->requestData)->assertOk()->assertJsonPath('data.total', 60000);
        $unassigned = Professional::create(['business_id' => $this->business->id, 'name' => 'No asignado', 'is_active' => true]);
        $this->postJson('/api/v2/appointments/quote', $this->requestData + ['professional_id' => $unassigned->id])->assertUnprocessable();
        $this->getJson('/api/v2/businesses/'.$this->business->id)->assertOk()
            ->assertJsonPath('data.branches.0.schedules.0.open_time', '09:00')
            ->assertJsonPath('data.services.0.currency', 'COP')
            ->assertJsonPath('data.services.0.professionals.0.branch_ids.0', $this->branch->id);
    }

    public function test_redemption_limit_counts_every_client_profile_and_reschedule_preserves_promotion_dates(): void
    {
        $promotion = $this->promotion();
        $promotion->update(['end_date' => '2026-10-05']);
        $id = $this->postJson('/api/v2/appointments', $this->requestData + ['promo_code' => $promotion->promo_code])->assertCreated()->json('data.id');
        $this->assertFalse($promotion->fresh()->canUseBy($this->customer->id));
        $this->postJson('/api/v2/appointments/quote', array_replace($this->requestData, ['start_time' => '12:00', 'promo_code' => $promotion->promo_code]))->assertUnprocessable();
        $this->postJson('/api/v2/appointments/'.$id.'/reschedule', ['date' => '2026-10-12', 'start_time' => '12:00'])->assertUnprocessable();
        $this->assertSame('2026-10-05', Appointment::findOrFail($id)->date->toDateString());
    }

    public function test_discovery_read_snapshot_is_not_reused_when_booking_changes_availability(): void
    {
        $discovery = app(\App\Modules\Business\Services\DiscoveryService::class);
        $filters = ['per_page' => 12, 'date' => '2026-10-05', 'time_from' => '10:00', 'time_to' => '10:00', 'available' => true];
        $this->assertSame(1, $discovery->search($filters)->data->total());
        $this->postJson('/api/v2/appointments', $this->requestData)->assertCreated();
        $this->assertSame(0, $discovery->search($filters)->data->total());
    }

    private function promotion(): Promotion
    {
        $promotion = Promotion::create(['business_id' => $this->business->id, 'title' => 'Manicure especial', 'type' => 'PERCENTAGE',
            'discount' => 10, 'promo_code' => 'MANOS10', 'start_date' => '2026-10-01', 'end_date' => '2026-10-31',
            'usage_limit' => 10, 'per_user_limit' => 1, 'is_active' => true]);
        $promotion->services()->attach($this->service->id, ['discount' => 10, 'type' => 'PERCENTAGE']);
        return $promotion;
    }
}
