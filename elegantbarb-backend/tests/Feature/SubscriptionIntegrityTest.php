<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Subscriptions\Models\Plan;
use App\Modules\Subscriptions\Models\UserSubscription;
use App\Modules\Subscriptions\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_subscription_requires_verified_wallet_payment_and_rejects_forged_external_id(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $plan = $this->plan('5000');
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/subscriptions', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        $this->postJson('/api/v2/subscriptions', [
            'plan_id' => $plan->id, 'external_subscription_id' => 'fake-approved', 'idempotency_key' => (string) Str::uuid(),
        ])->assertUnprocessable();
        $this->assertSame(0, UserSubscription::count());
    }

    public function test_wallet_payment_and_subscription_activation_are_idempotent_and_exact(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $plan = $this->plan('5000.25');
        $wallet = app(WalletRepository::class)->getOrCreate($user->id);
        $wallet->credit('10000');
        Sanctum::actingAs($user);
        $request = ['plan_id' => $plan->id, 'payment_method' => 'WALLET', 'idempotency_key' => (string) Str::uuid()];
        $first = $this->postJson('/api/v2/subscriptions', $request)->assertCreated()->assertJsonPath('data.payment_method', 'WALLET');
        $this->postJson('/api/v2/subscriptions', $request)->assertCreated()->assertJsonPath('data.id', $first->json('data.id'));
        $this->assertSame('4999.75', $wallet->fresh()->balance);
        $this->assertSame(1, UserSubscription::count());
        $this->assertSame(1, $wallet->transactions()->where('source_type', 'SUBSCRIPTION')->count());
        $this->postJson('/api/v2/subscriptions', array_replace($request, ['idempotency_key' => (string) Str::uuid()]))->assertUnprocessable();
        $this->postJson('/api/v2/subscriptions', array_replace($request, ['plan_id' => $this->plan('100')->id]))->assertUnprocessable();
    }

    public function test_insufficient_spendable_funds_roll_back_subscription_and_ledger(): void
    {
        $user = User::factory()->create();
        $wallet = app(WalletRepository::class)->getOrCreate($user->id);
        $wallet->credit('10000');
        $wallet->update(['hold_balance' => '9000']);
        $response = app(SubscriptionService::class)->subscribe($user->id, $this->plan('5000')->id, ['payment_method' => 'WALLET', 'idempotency_key' => (string) Str::uuid()]);
        $this->assertSame(422, $response->statusCode);
        $this->assertSame(0, UserSubscription::count());
        $this->assertSame('10000.00', $wallet->fresh()->balance);
        $this->assertSame(0, $wallet->transactions()->where('source_type', 'SUBSCRIPTION')->count());
    }

    public function test_cancellation_is_owned_idempotent_and_cannot_reset_free_plan_credits(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $service = app(SubscriptionService::class);
        $plan = $this->plan('0');
        $subscription = $service->subscribe($user->id, $plan->id, ['idempotency_key' => (string) Str::uuid()])->data;
        $other = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($other);
        $this->postJson('/api/v2/subscriptions/' . $subscription->id . '/cancel', [])->assertForbidden();
        $this->assertSame(404, $service->cancel($subscription->id, '', $other->id)->statusCode);
        $this->assertSame('ACTIVE', $subscription->fresh()->status);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/subscriptions/' . $subscription->id . '/cancel', [])->assertOk();
        $this->postJson('/api/v2/subscriptions/' . $subscription->id . '/cancel', [])->assertOk();
        $this->assertSame(422, $service->subscribe($user->id, $plan->id, ['idempotency_key' => (string) Str::uuid()])->statusCode);
        $this->assertSame(0, DB::table('finance.wallet_transactions')->count());
    }

    public function test_credit_consumption_locks_fresh_state_and_replays_source_without_double_charge(): void
    {
        $user = User::factory()->create();
        $plan = $this->plan('0');
        $plan->update(['credits_per_cycle' => 1]);
        $subscription = app(SubscriptionService::class)->subscribe($user->id, $plan->id, ['idempotency_key' => (string) Str::uuid()])->data;
        $stale = UserSubscription::findOrFail($subscription->id);
        $usage = $subscription->consumeCredit('APPOINTMENT', ['source_type' => 'APPOINTMENT', 'source_id' => 100]);
        $retry = $stale->consumeCredit('APPOINTMENT', ['source_type' => 'APPOINTMENT', 'source_id' => 100]);
        $this->assertSame($usage->id, $retry->id);
        $this->assertSame(0, $subscription->fresh()->credits_remaining);
        $this->assertSame(1, $subscription->fresh()->appointments_used);
        $this->expectException(\RuntimeException::class);
        $stale->consumeCredit('APPOINTMENT', ['source_type' => 'APPOINTMENT', 'source_id' => 101]);
    }

    public function test_cancelled_subscription_cannot_consume_unused_credits(): void
    {
        $user = User::factory()->create();
        $service = app(SubscriptionService::class);
        $subscription = $service->subscribe($user->id, $this->plan('0')->id, ['idempotency_key' => (string) Str::uuid()])->data;
        $service->cancel($subscription->id, 'Cambio', $user->id);
        $this->expectException(\RuntimeException::class);
        $subscription->consumeCredit('APPOINTMENT');
    }

    public function test_business_paid_membership_requires_checkout_and_free_membership_still_works(): void
    {
        $client = \App\Modules\People\Models\Client::factory()->create(['business_id' => \App\Modules\Business\Models\Business::factory()->create()->id]);
        $plan = \App\Modules\Subscriptions\Models\MembershipPlan::create([
            'business_id' => $client->business_id, 'name' => 'Membresía', 'slug' => (string) Str::uuid(),
            'price' => '25000', 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 2, 'is_active' => true,
        ]);
        $service = app(\App\Modules\Subscriptions\Services\MembershipService::class);
        $this->assertSame(422, $service->subscribe($client->id, $plan->id)->statusCode);
        $this->assertSame(0, \App\Modules\Subscriptions\Models\ClientMembership::count());
        $plan->update(['price' => 0]);
        $this->assertSame(201, $service->subscribe($client->id, $plan->id)->statusCode);
    }

    public function test_free_business_membership_http_ownership_and_retry_are_enforced(): void
    {
        $client = \App\Modules\People\Models\Client::factory()->create();
        $client->user->update(['role' => 'CLIENTE', 'cliente_id' => $client->id]);
        $plan = \App\Modules\Subscriptions\Models\MembershipPlan::create([
            'business_id' => \App\Modules\Business\Models\Business::factory()->create()->id, 'name' => 'Gratis', 'slug' => (string) Str::uuid(),
            'price' => '0', 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 1, 'is_active' => true,
        ]);
        Sanctum::actingAs($client->user->fresh());
        $request = ['client_id' => $client->id, 'plan_id' => $plan->id];
        $id = $this->postJson('/api/v2/memberships/subscribe', $request)->assertCreated()->json('data.id');
        $this->postJson('/api/v2/memberships/subscribe', $request)->assertCreated()->assertJsonPath('data.id', $id);
        $this->getJson('/api/v2/memberships/my?client_id=' . $client->id)->assertOk()->assertJsonCount(1, 'data');
        Sanctum::actingAs(\App\Modules\People\Models\Client::factory()->create()->user);
        $this->postJson('/api/v2/memberships/' . $id . '/cancel', ['client_id' => $client->id])->assertForbidden();
        Sanctum::actingAs($client->user->fresh());
        $this->postJson('/api/v2/memberships/' . $id . '/cancel', ['client_id' => $client->id])->assertOk();
        $this->postJson('/api/v2/memberships/subscribe', $request)->assertUnprocessable();
    }

    private function plan(string $price): Plan
    {
        return Plan::create(['name' => 'Plan', 'slug' => (string) Str::uuid(), 'price' => $price, 'currency' => 'COP',
            'billing_cycle' => 'MONTHLY', 'credits_per_cycle' => 3, 'is_active' => true]);
    }
}
