<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Benefits\Services\LoyaltyBenefitService;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentPricingService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Realtime\Events\ResourceChanged;
use App\Modules\Realtime\Services\ResourceChangePublisher;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Modules\Subscriptions\Services\MembershipService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class BenefitsAdministrationTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id, 'is_active' => true]);
        $user = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        $service = Service::factory()->create(['business_id' => $business->id, 'is_active' => true, 'price' => 50000]);
        $plan = MembershipPlan::create(['business_id' => $business->id, 'name' => 'Club', 'slug' => 'club-'.Str::uuid(),
            'price' => '59000.00', 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 2,
            'included_services' => [$service->id], 'discount_percentage' => 10, 'benefits' => [], 'is_active' => true]);
        return [$owner, $business, $user, $client, $service, $plan];
    }

    private function appointment(Business $business, Client $client, Service $service): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Prueba', 'is_active' => true]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => now()->addDay()->toDateString(), 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => 'PENDING', 'price' => 50000, 'final_price' => 50000, 'booking_code' => Str::random(12)]);
    }

    public function test_analytics_use_verified_snapshots_and_business_scoped_transactions(): void
    {
        [$owner, $business, $user, $client, $service, $plan] = $this->fixture();
        $memberships = app(MembershipService::class);
        $metadata = $memberships->prepareCheckout($user->id, $plan->id)['metadata'];
        $orderId = (string) Str::uuid();
        $membership = $memberships->fulfillVerifiedPayment($user->id, $plan->id, $orderId, '59000.00', $metadata);
        $plan->update(['price' => '99000.00']);
        $appointment = $this->appointment($business, $client, $service);
        $memberships->redeemQuote(['id' => $membership->id, 'included_appointment' => true], $appointment->id, 50000);
        $promotion = Promotion::create(['business_id' => $business->id, 'title' => 'Oferta', 'promo_code' => 'CLUB20',
            'type' => 'PERCENTAGE', 'discount' => 20, 'is_active' => true, 'start_date' => now()->subDay(), 'end_date' => now()->addWeek()]);
        $promotion->usages()->create(['client_id' => $client->id, 'saved_amount' => 10000]);
        [, $foreign, $foreignUser, , , $foreignPlan] = $this->fixture();
        $memberships->fulfillVerifiedPayment($foreignUser->id, $foreignPlan->id, (string) Str::uuid(), '59000.00',
            $memberships->prepareCheckout($foreignUser->id, $foreignPlan->id)['metadata']);
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/benefits/admin?business_id='.$business->id)->assertOk()
            ->assertJsonPath('data.analytics.memberships.verified_revenue', 59000)
            ->assertJsonPath('data.analytics.memberships.used_appointments', 1)
            ->assertJsonPath('data.analytics.promotions.saved_amount', 10000)
            ->assertJsonPath('data.analytics.promotions.unique_clients', 1)
            ->assertJsonPath('data.memberships.0.amount_paid', 59000)
            ->assertJsonCount(1, 'data.memberships')->assertJsonCount(3, 'data.transactions');
        $this->getJson('/api/v2/benefits/admin?business_id='.$foreign->id)->assertForbidden();
        $memberships->revokeVerifiedPayment($orderId, 'VOIDED');
        $this->getJson('/api/v2/benefits/admin')->assertJsonPath('data.analytics.memberships.verified_revenue', 0);
    }

    public function test_archiving_preserves_paid_terms_and_history_and_blocks_foreign_mutations(): void
    {
        [$owner, $business, $user, $client, $service, $plan] = $this->fixture();
        $memberships = app(MembershipService::class);
        $membership = $memberships->fulfillVerifiedPayment($user->id, $plan->id, (string) Str::uuid(), '59000.00',
            $memberships->prepareCheckout($user->id, $plan->id)['metadata']);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->deleteJson('/api/v2/benefits/admin/plans/'.$plan->id)->assertNotFound();
        Sanctum::actingAs($owner);
        $this->deleteJson('/api/v2/benefits/admin/plans/'.$plan->id)->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('subscriptions.client_memberships', ['id' => $membership->id, 'status' => 'ACTIVE']);
        $quote = app(AppointmentPricingService::class)->quote(['business_id' => $business->id, 'service_id' => $service->id,
            'price' => 50000, 'date' => now()->addDay()->toDateString(), 'start_time' => '10:00'], $client->id);
        $this->assertSame($membership->id, $quote['membership']['id']);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/benefits?business_id='.$business->id)->assertOk()->assertJsonCount(0, 'data.plans')->assertJsonCount(1, 'data.memberships');
        $this->postJson('/api/v2/benefits/plans/'.$plan->id.'/subscribe')->assertNotFound();
    }

    public function test_coupon_redemption_and_its_notification_are_idempotent(): void
    {
        [$owner, $business, $user, $client, $service] = $this->fixture();
        Sanctum::actingAs($owner);
        $payload = ['business_id' => $business->id, 'title' => 'Regresa', 'promo_code' => '  cuidado20 ', 'type' => 'PERCENTAGE',
            'discount' => 20, 'is_active' => true, 'start_date' => now()->subDay()->toDateString(), 'end_date' => now()->addWeek()->toDateString(), 'usage_limit' => 1, 'per_user_limit' => 1];
        $id = $this->postJson('/api/v2/benefits/admin/promotions', $payload)->assertCreated()->assertJsonPath('data.promo_code', 'CUIDADO20')->json('data.id');
        $this->postJson('/api/v2/benefits/admin/promotions', [...$payload, 'promo_code' => 'cuidado20'])->assertUnprocessable();
        Promotion::findOrFail($id)->services()->attach($service->id, ['type' => 'PERCENTAGE', 'discount' => 20]);
        $this->getJson('/api/v2/promotions?business_id='.$business->id)->assertOk()->assertJsonPath('data.0.services.0.id', $service->id);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/promotions/validate', ['business_id' => $business->id, 'code' => '  cuidado20 ', 'subtotal' => 50000])
            ->assertOk()->assertJsonPath('data.code', 'CUIDADO20');
        Sanctum::actingAs($owner);
        $appointment = $this->appointment($business, $client, $service);
        $pricing = app(AppointmentPricingService::class);
        $quote = $pricing->quote(['business_id' => $business->id, 'service_id' => $service->id, 'price' => 50000,
            'date' => $appointment->date->toDateString(), 'start_time' => '10:00', 'promo_code' => 'cuidado20'], $client->id);
        $pricing->redeem($quote, $appointment->id, $client->id);
        $pricing->redeem($quote, $appointment->id, $client->id);
        $this->assertSame(1, Promotion::findOrFail($id)->usage_count);
        $this->assertDatabaseCount('marketing.promotion_redemptions', 1);
        $this->assertSame(1, DB::table('marketing.notifications')->where('user_id', $user->id)->where('type', 'PROMOTION_USED')->count());
        $this->deleteJson('/api/v2/benefits/admin/promotions/'.$id)->assertOk();
        $this->assertDatabaseCount('marketing.promotion_redemptions', 1);
    }

    public function test_stamp_notifications_are_once_and_suspended_memberships_cannot_clear_payment_review(): void
    {
        [$owner, $business, $user, , , $plan] = $this->fixture();
        $program = LoyaltyProgram::create(['business_id' => $business->id, 'name' => 'Visitas', 'reward_description' => 'Premio',
            'stamps_required' => 1, 'type' => 'STAMP', 'active' => true]);
        $card = app(LoyaltyBenefitService::class)->enroll($user, $program->id);
        Sanctum::actingAs($owner);
        $payload = ['idempotency_key' => (string) Str::uuid()];
        $this->postJson('/api/v2/benefits/admin/cards/'.$card->id.'/stamp', $payload)->assertOk();
        $this->postJson('/api/v2/benefits/admin/cards/'.$card->id.'/stamp', $payload)->assertOk();
        $this->assertSame(1, DB::table('marketing.notifications')->where('user_id', $user->id)->where('type', 'LOYALTY_REWARD_READY')->count());
        $memberships = app(MembershipService::class);
        $orderId = (string) Str::uuid();
        $membership = $memberships->fulfillVerifiedPayment($user->id, $plan->id, $orderId, '59000.00',
            $memberships->prepareCheckout($user->id, $plan->id)['metadata']);
        $memberships->revokeVerifiedPayment($orderId, 'VOIDED');
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/benefits/memberships/'.$membership->id.'/cancel')->assertUnprocessable();
        $this->assertSame('SUSPENDED', $membership->fresh()->status);
    }

    public function test_catalog_changes_are_public_invalidations_and_membership_usage_resolves_its_business(): void
    {
        [$owner, $business, $user, , , $plan] = $this->fixture();
        $memberships = app(MembershipService::class);
        $membership = $memberships->fulfillVerifiedPayment($user->id, $plan->id, (string) Str::uuid(), '59000.00',
            $memberships->prepareCheckout($user->id, $plan->id)['metadata']);
        config(['realtime.enabled' => true]);
        Event::fake([ResourceChanged::class]);
        $publisher = app(ResourceChangePublisher::class);
        $publisher->record('loyalty.loyalty_programs', [['business_id' => $business->id]]);
        Event::assertDispatched(ResourceChanged::class, fn (ResourceChanged $event) => $event->channels === ['marketplace'] && in_array('loyalty', $event->topics, true));
        Event::fake([ResourceChanged::class]);
        $publisher->record('subscriptions.membership_usage', [['client_membership_id' => $membership->id]]);
        Event::assertDispatched(ResourceChanged::class, fn (ResourceChanged $event) => $event->channels === ['business.'.$business->id]);
        Event::assertDispatched(ResourceChanged::class, fn (ResourceChanged $event) => $event->channels === ['user.'.$user->id]);
        Event::assertNotDispatched(ResourceChanged::class, fn (ResourceChanged $event) => $event->channels === ['marketplace']);
    }
}
