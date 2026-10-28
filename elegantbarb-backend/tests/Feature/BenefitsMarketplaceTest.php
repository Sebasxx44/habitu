<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Benefits\Services\LoyaltyBenefitService;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentPricingService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Modules\Subscriptions\Services\MembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BenefitsMarketplaceTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $admin->id]);
        $service = Service::factory()->create(['business_id' => $business->id, 'is_active' => true, 'price' => 50000]);
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        $program = LoyaltyProgram::create(['business_id' => $business->id, 'name' => 'Visitas con premio', 'reward_description' => 'Masaje de cortesía', 'stamps_required' => 2, 'type' => 'STAMP', 'active' => true, 'valid_until' => now()->addMonth()]);
        return [$user, $admin, $business, $service, $client, $program];
    }

    private function plan(Business $business, Service $service, array $overrides = []): MembershipPlan
    {
        return MembershipPlan::create(array_replace(['business_id' => $business->id, 'name' => 'Rutina', 'slug' => (string) Str::uuid(), 'price' => 0,
            'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 1, 'included_services' => [$service->id],
            'discount_percentage' => 15, 'benefits' => [], 'is_active' => true], $overrides));
    }

    private function appointment(Business $business, Service $service, Client $client, string $status = 'COMPLETED'): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Calle demo', 'is_active' => true]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => now()->toDateString(), 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => $status, 'price' => 50000, 'final_price' => 50000, 'booking_code' => Str::random(12)]);
    }

    public function test_catalog_shows_eligible_offers_and_owned_progress_without_private_details(): void
    {
        [$user, , $business, $service, $client, $program] = $this->fixture();
        $plan = $this->plan($business, $service);
        $promotion = Promotion::create(['business_id' => $business->id, 'title' => 'Cuidado', 'type' => 'PERCENTAGE', 'discount' => 20,
            'promo_code' => 'CUIDADO20', 'start_date' => now()->subDay(), 'end_date' => now()->addWeek(), 'is_active' => true, 'per_user_limit' => 1]);
        $promotion->services()->attach($service->id, ['type' => 'PERCENTAGE', 'discount' => 25]);
        Promotion::create(['business_id' => $business->id, 'title' => 'Vencida', 'type' => 'PERCENTAGE', 'discount' => 50,
            'start_date' => now()->subWeek(), 'end_date' => now(config('booking.timezone'))->subDay()->toDateString(), 'is_active' => true]);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/benefits/programs/'.$program->id.'/join')->assertCreated();
        $this->postJson('/api/v2/benefits/programs/'.$program->id.'/join')->assertCreated();
        $this->assertSame(1, LoyaltyCard::count());
        $this->getJson('/api/v2/benefits')->assertOk()->assertJsonCount(1, 'data.promotions')->assertJsonPath('data.promotions.0.eligible', true)
            ->assertJsonPath('data.promotions.0.services.0.discount', 25)->assertJsonPath('data.plans.0.eligible_services.0.id', $service->id)
            ->assertJsonPath('data.summary.cards', 1)->assertJsonPath('data.programs.0.card.stamps', 0)->assertJsonMissing(['email' => $user->email]);
        DB::table('marketing.promotion_redemptions')->insert(['promotion_id' => $promotion->id, 'client_id' => $client->id, 'saved_amount' => 5000, 'created_at' => now()]);
        $this->getJson('/api/v2/benefits')->assertJsonPath('data.promotions.0.eligible', false)->assertJsonPath('data.promotions.0.remaining_for_you', 0);
        $this->getJson('/api/v2/benefits?q=NoSuchBusiness')->assertJsonCount(0, 'data.promotions')->assertJsonCount(0, 'data.plans');
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/benefits')->assertJsonPath('data.summary.cards', 0)->assertJsonPath('data.programs.0.card', null);
    }

    public function test_completed_visits_award_once_and_claim_creates_single_owned_voucher(): void
    {
        [$user, $admin, $business, $service, $client, $program] = $this->fixture();
        $loyalty = app(LoyaltyBenefitService::class);
        $card = $loyalty->enroll($user, $program->id);
        $appointment = $this->appointment($business, $service, $client);
        DB::transaction(fn () => $loyalty->awardCompleted($appointment));
        DB::transaction(fn () => $loyalty->awardCompleted($appointment));
        $this->assertSame(1, $card->fresh()->current_stamps);
        $this->assertSame(1, DB::table('loyalty.loyalty_transactions')->count());
        $second = $this->appointment($business, $service, $client);
        DB::transaction(fn () => $loyalty->awardCompleted($second));
        Sanctum::actingAs($user);
        $key = (string) Str::uuid();
        $this->postJson('/api/loyalty/mine/'.$card->id.'/redeem', ['idempotency_key' => $key])->assertOk();
        $this->postJson('/api/loyalty/mine/'.$card->id.'/redeem', ['idempotency_key' => $key])->assertOk();
        $this->assertSame(0, $card->fresh()->current_stamps);
        $this->assertSame(1, DB::table('loyalty.reward_vouchers')->count());
        $voucher = DB::table('loyalty.reward_vouchers')->first();
        $this->getJson('/api/v2/benefits')->assertJsonPath('data.vouchers.0.code', $voucher->code)->assertJsonPath('data.summary.available_vouchers', 1);
        $this->postJson('/api/v2/benefits/admin/vouchers/consume', ['code' => $voucher->code])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->postJson('/api/v2/benefits/admin/vouchers/consume', ['code' => $voucher->code])->assertNotFound();
        Sanctum::actingAs($admin);
        $this->postJson('/api/v2/benefits/admin/vouchers/consume', ['code' => $voucher->code])->assertOk()->assertJsonPath('data.status', 'USED');
        $this->postJson('/api/v2/benefits/admin/vouchers/consume', ['code' => $voucher->code])->assertOk();
        $this->assertSame(1, DB::table('loyalty.reward_vouchers')->where('status', 'USED')->count());
    }

    public function test_membership_booking_credit_is_atomic_idempotent_scoped_and_restored_once(): void
    {
        [$user, , $business, $service, $client] = $this->fixture();
        $plan = $this->plan($business, $service);
        $memberships = app(MembershipService::class);
        $membership = $memberships->subscribeForUser($user->id, $plan->id)->data;
        $reservation = ['business_id' => $business->id, 'service_id' => $service->id, 'price' => 50000, 'date' => now()->addDay()->toDateString(), 'start_time' => '10:00'];
        $pricing = app(AppointmentPricingService::class);
        $quote = $pricing->quote($reservation, $client->id);
        $this->assertSame(0.0, $quote['total']);
        $this->assertTrue($quote['membership']['included_appointment']);
        $appointment = $this->appointment($business, $service, $client, 'PENDING');
        DB::transaction(fn () => $pricing->redeem($quote, $appointment->id, $client->id));
        DB::transaction(fn () => $pricing->redeem($quote, $appointment->id, $client->id));
        $this->assertSame(0, $membership->fresh()->appointments_remaining);
        $this->assertSame(1, DB::table('subscriptions.membership_usage')->count());
        $after = $pricing->quote($reservation, $client->id);
        $this->assertSame(42500.0, $after['total']);
        $this->assertFalse($after['membership']['included_appointment']);
        DB::transaction(fn () => $memberships->restoreCancelled($appointment->id));
        DB::transaction(fn () => $memberships->restoreCancelled($appointment->id));
        $this->assertSame(1, $membership->fresh()->appointments_remaining);
        $this->assertSame(0, $membership->fresh()->appointments_used);
        $other = Service::factory()->create(['business_id' => $business->id]);
        $this->assertNull($pricing->quote(array_replace($reservation, ['service_id' => $other->id]), $client->id)['membership']);
        $this->assertNull($pricing->quote(array_replace($reservation, ['date' => now()->addMonths(2)->toDateString()]), $client->id)['membership']);
    }

    public function test_promotion_and_membership_do_not_stack_and_owned_cancellation_does_not_refill(): void
    {
        [$user, , $business, $service, $client] = $this->fixture();
        $membership = app(MembershipService::class)->subscribeForUser($user->id, $this->plan($business, $service)->id)->data;
        Promotion::create(['business_id' => $business->id, 'title' => 'Oferta', 'promo_code' => 'ONLY20', 'type' => 'PERCENTAGE', 'discount' => 20,
            'is_active' => true, 'start_date' => now()->subDay(), 'end_date' => now()->addWeek()]);
        $reservation = ['business_id' => $business->id, 'service_id' => $service->id, 'price' => 50000, 'date' => now()->addDay()->toDateString(), 'start_time' => '10:00', 'promo_code' => 'ONLY20'];
        $quote = app(AppointmentPricingService::class)->quote($reservation, $client->id);
        $this->assertSame(40000.0, $quote['total']);
        $this->assertNull($quote['membership']);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/benefits/memberships/'.$membership->id.'/cancel')->assertNotFound();
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/benefits/memberships/'.$membership->id.'/cancel')->assertOk();
        $this->postJson('/api/v2/benefits/plans/'.$membership->membership_plan_id.'/subscribe')->assertUnprocessable();
        $this->assertSame(1, ClientMembership::count());
    }

    public function test_admin_can_manage_only_owned_benefits_and_cannot_reprice_existing_stamp_targets(): void
    {
        [$user, $admin, $business, $service, $client, $program] = $this->fixture();
        Sanctum::actingAs($admin);
        $this->getJson('/api/v2/benefits/admin')->assertOk()->assertJsonPath('data.business_id', $business->id)->assertJsonPath('data.programs.0.valid_until', $program->valid_until->toDateString());
        $this->postJson('/api/v2/benefits/admin/plans', ['business_id' => $business->id, 'name' => 'Club', 'description' => '', 'price' => 10000,
            'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 2, 'discount_percentage' => 10, 'is_active' => true,
            'included_services' => [$service->id], 'benefits' => ['Rutina de cuidado']])->assertCreated();
        $foreignService = Service::factory()->create();
        $this->postJson('/api/v2/benefits/admin/plans', ['business_id' => $business->id, 'name' => 'Club', 'price' => 0, 'currency' => 'COP',
            'billing_cycle' => 'MONTHLY', 'appointments_included' => 1, 'discount_percentage' => 0, 'is_active' => true,
            'included_services' => [$foreignService->id], 'benefits' => []])->assertUnprocessable();
        $card = app(LoyaltyBenefitService::class)->enroll($user, $program->id);
        $key = (string) Str::uuid();
        $this->postJson('/api/v2/benefits/admin/cards/'.$card->id.'/stamp', ['idempotency_key' => $key])->assertOk();
        $this->postJson('/api/v2/benefits/admin/cards/'.$card->id.'/stamp', ['idempotency_key' => $key])->assertOk();
        $this->assertSame(1, $card->fresh()->current_stamps);
        $this->getJson('/api/v2/benefits/admin/cards/'.$card->id)->assertOk()->assertJsonCount(1, 'data.history');
        $this->putJson('/api/v2/benefits/admin/programs/'.$program->id, ['business_id' => $business->id, 'name' => $program->name,
            'reward_description' => $program->reward_description, 'stamps_required' => 10, 'active' => true])->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/v2/benefits/admin?business_id='.$business->id)->assertForbidden();
        $this->putJson('/api/v2/benefits/admin/programs/'.$program->id, ['business_id' => $business->id])->assertForbidden();
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/benefits/admin')->assertForbidden();
    }
    public function test_last_day_rewards_and_promotions_expire_at_bogota_midnight(): void
    {
        \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-10-04 01:00:00', 'UTC'));
        try {
            [$user, , $business, , , $program] = $this->fixture();
            $program->update(['valid_until' => '2026-10-03']);
            $card = app(LoyaltyBenefitService::class)->enroll($user, $program->id);
            $card->update(['current_stamps' => 2, 'reward_available' => true]);
            Sanctum::actingAs($user);
            $this->postJson('/api/loyalty/mine/'.$card->id.'/redeem', ['idempotency_key' => (string) Str::uuid()])->assertOk();
            $voucher = DB::table('loyalty.reward_vouchers')->first();
            $this->assertTrue(now()->lt($voucher->expires_at));
            $this->assertSame('2026-10-04 04:59:59', $voucher->expires_at);
            $promotion = Promotion::create(['business_id' => $business->id, 'title' => 'Último día', 'type' => 'PERCENTAGE', 'discount' => 10,
                'start_date' => '2026-10-01', 'end_date' => '2026-10-03', 'is_active' => true]);
            $this->assertTrue($promotion->isValid());
            \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse('2026-10-04 05:01:00', 'UTC'));
            $this->assertFalse($promotion->isValid());
            $this->getJson('/api/v2/benefits')->assertJsonPath('data.vouchers.0.status', 'EXPIRED');
        } finally { \Carbon\Carbon::setTestNow(); }
    }

    public function test_revoked_paid_membership_blocks_existing_unfulfilled_benefit(): void
    {
        [$user, , $business, $service, $client] = $this->fixture();
        $plan = $this->plan($business, $service, ['price' => '59000.00']);
        $memberships = app(MembershipService::class);
        $prepared = $memberships->prepareCheckout($user->id, $plan->id);
        $order = (string) Str::uuid();
        $membership = $memberships->fulfillVerifiedPayment($user->id, $plan->id, $order, '59000.00', $prepared['metadata']);
        $appointment = $this->appointment($business, $service, $client, 'PENDING');
        $memberships->redeemQuote(['id' => $membership->id, 'included_appointment' => true], $appointment->id, 50000);
        $memberships->revokeVerifiedPayment($order, 'VOIDED');
        $memberships->revokeVerifiedPayment($order, 'VOIDED');
        $this->assertSame('SUSPENDED', $membership->fresh()->status);
        foreach ([fn () => $memberships->validateFulfillment($appointment->id),
            fn () => $memberships->validateReschedule($appointment->id, now()->addDay()->toDateString(), '10:00')] as $operation) {
            try { $operation(); $this->fail('Suspended benefit was accepted.'); }
            catch (\Illuminate\Validation\ValidationException $exception) { $this->assertArrayHasKey('membership', $exception->errors()); }
        }
        $this->assertSame(0, $membership->fresh()->appointments_remaining);
        $this->assertSame(1, DB::table('subscriptions.membership_usage')->count());
    }

}
