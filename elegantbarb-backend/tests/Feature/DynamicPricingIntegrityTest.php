<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\DynamicPricingRule;
use App\Modules\Catalog\Models\Service;
use App\Modules\Catalog\Services\DynamicPricingService;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class DynamicPricingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private array $reservation;
    private User $owner;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 3)->setTime(12, 0));
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendCancellationNotification', 'sendPostServiceSurvey')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar', 'deleteCalendarEvent')->andReturn(null));
        $this->owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $this->business = Business::factory()->create(['owner_user_id' => $this->owner->id]);
        $branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Principal', 'address' => 'Prueba', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $this->business->id, 'booking_model' => 'direct', 'duration_minutes' => 30, 'buffer_minutes' => 0, 'price' => 30000]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        $this->reservation = ['business_id' => $this->business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => Client::factory()->create(['business_id' => $this->business->id])->id, 'date' => '2026-10-05', 'start_time' => '10:00', 'price' => 30000];
    }

    public function test_rule_endpoints_require_tenant_administration_and_validate_scope(): void
    {
        $this->getJson('/api/v2/dynamic-pricing/rules?business_id='.$this->business->id)->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/dynamic-pricing/rules?business_id='.$this->business->id)->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->postJson('/api/v2/dynamic-pricing/rules', $this->rule())->assertForbidden();
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/v2/dynamic-pricing/rules', [...$this->rule(), 'service_id' => Service::factory()->create()->id])->assertForbidden();
        $this->postJson('/api/v2/dynamic-pricing/rules', [...$this->rule(), 'conditions' => ['days_of_week' => [1], 'time_start' => '18:00', 'time_end' => '09:00']])->assertUnprocessable();
        $this->postJson('/api/v2/dynamic-pricing/rules', [...$this->rule(), 'rule_type' => 'DEMAND'])->assertUnprocessable();
        $response = $this->postJson('/api/v2/dynamic-pricing/rules', $this->rule())->assertCreated();
        $id = $response->json('rule.id');
        $this->putJson('/api/v2/dynamic-pricing/rules/'.$id, [...$this->rule(), 'is_active' => false])->assertOk()->assertJsonPath('rule.is_active', false);
        $this->deleteJson('/api/v2/dynamic-pricing/rules/'.$id.'?business_id='.$this->business->id)->assertOk();
        $this->assertDatabaseMissing('platform.dynamic_pricing_rules', ['id' => $id]);
    }

    public function test_quote_slots_and_persisted_booking_share_one_rule_and_reject_changed_totals(): void
    {
        $rule = DynamicPricingRule::create($this->rule());
        $slots = app(AvailabilityService::class)->slots($this->reservation);
        $slot = collect($slots['slots'])->firstWhere('start_time', '10:00:00');
        $this->assertEquals(38500, $slot['price']);
        $this->assertEquals($rule->id, $slot['dynamic_pricing']['rule']['id']);
        $this->assertEquals(30000, collect($slots['slots'])->firstWhere('start_time', '12:00:00')['price']);
        Sanctum::actingAs(User::findOrFail(Client::findOrFail($this->reservation['client_id'])->user_id));
        $payload = array_diff_key($this->reservation, ['client_id' => true, 'price' => true]);
        $this->postJson('/api/v2/appointments/quote', $payload)->assertOk()->assertJsonPath('data.total', 38500);
        $this->postJson('/api/v2/appointments', [...$payload, 'expected_total' => 30000])->assertUnprocessable()->assertJsonValidationErrors('expected_total');
        $this->assertSame(0, Appointment::count());
        $response = $this->postJson('/api/v2/appointments', [...$payload, 'expected_total' => 38500])->assertCreated();
        $appointment = Appointment::findOrFail($response->json('data.id'));
        $this->assertEquals(38500, $appointment->final_price);
        $this->assertEquals($rule->id, $appointment->dynamic_pricing['rule']['id']);
        $this->assertDatabaseCount('platform.dynamic_pricing_snapshots', 0);
    }

    public function test_priority_specificity_and_booking_date_control_matching_without_stacking(): void
    {
        DynamicPricingRule::create([...$this->rule(), 'service_id' => null, 'multiplier' => 2, 'priority' => 100]);
        $specific = DynamicPricingRule::create([...$this->rule(), 'priority' => 100, 'starts_at' => '2026-10-05 05:00:00', 'ends_at' => '2026-10-06 04:59:59']);
        DynamicPricingRule::create([...$this->rule(), 'priority' => 100, 'multiplier' => 3]);
        DynamicPricingRule::create([...$this->rule(), 'priority' => 900, 'rule_type' => 'DEMAND', 'multiplier' => 4]);
        DynamicPricingRule::create([...$this->rule(), 'priority' => 999, 'business_id' => Business::factory()->create()->id, 'service_id' => null, 'multiplier' => 5]);
        $price = app(DynamicPricingService::class)->evaluate($this->reservation);
        $this->assertEquals(38500, $price['price']);
        $this->assertEquals($specific->id, $price['rule']['id']);
        $this->assertEquals(30000, app(DynamicPricingService::class)->evaluate([...$this->reservation, 'date' => '2026-10-06'])['price']);
    }

    public function test_simulation_is_read_only_and_money_overflow_is_rejected_before_persistence(): void
    {
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/v2/dynamic-pricing/calculate', $this->reservation)->assertOk()->assertJsonPath('slots.0.price', 30000);
        $this->assertDatabaseCount('booking.appointments', 0);
        $this->assertDatabaseCount('platform.dynamic_pricing_snapshots', 0);
        DynamicPricingRule::create([...$this->rule(), 'flat_adjustment' => 99999999]);
        $this->expectException(ValidationException::class);
        app(DynamicPricingService::class)->evaluate($this->reservation);
    }

    private function rule(): array
    {
        return ['business_id' => $this->business->id, 'service_id' => $this->reservation['service_id'], 'name' => 'Horario de prueba', 'rule_type' => 'PEAK_HOUR', 'timezone' => 'America/Bogota',
            'conditions' => ['days_of_week' => [1], 'time_start' => '09:00', 'time_end' => '12:00'], 'multiplier' => 1.25, 'flat_adjustment' => 1000, 'priority' => 10, 'is_active' => true, 'starts_at' => null, 'ends_at' => null];
    }
}
