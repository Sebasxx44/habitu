<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WompiMembershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.wompi.environment' => 'test', 'services.wompi.public_key' => 'pub_test_local',
            'services.wompi.private_key' => 'prv_test_local', 'services.wompi.integrity_secret' => 'test_integrity_local',
            'services.wompi.events_secret' => 'test_events_local', 'services.wompi.frontend_url' => 'https://habitu.test']);
        Http::preventStrayRequests();
    }

    private function plan(array $overrides = []): MembershipPlan
    {
        return MembershipPlan::create(array_replace([
            'business_id' => Business::factory()->create(['is_active' => true])->id,
            'name' => 'Club de cuidado', 'slug' => 'club-'.Str::uuid(), 'price' => '49900.25', 'currency' => 'COP',
            'billing_cycle' => 'MONTHLY', 'appointments_included' => 3, 'included_services' => [],
            'discount_percentage' => '10.00', 'benefits' => ['Tres visitas incluidas'], 'is_active' => true, 'sort_order' => 1,
        ], $overrides));
    }

    public function test_verified_checkout_activates_purchased_terms_once_without_resetting_used_benefits(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($user);
        $plan = $this->plan();
        $payload = ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid(), 'amount' => 1,
            'metadata' => ['appointments_included' => 999]];
        $response = $this->postJson('/api/v2/wompi/membership', $payload)->assertOk()
            ->assertJsonPath('data.amount', '49900.25')->assertJsonPath('data.status', 'PENDING');
        $order = CheckoutOrder::findOrFail($response->json('data.id'));
        $this->postJson('/api/v2/wompi/membership', $payload)->assertOk()->assertJsonPath('data.id', $order->id);
        $this->assertSame(0, ClientMembership::count());
        $this->getJson('/api/v2/wompi/orders/'.$order->id.'?status=APPROVED')->assertOk()->assertJsonPath('data.status', 'PENDING');
        $plan->update(['price' => '99900.00', 'appointments_included' => 1, 'discount_percentage' => 0]);
        $transaction = ['id' => 'test-membership-123', 'reference' => $order->reference, 'amount_in_cents' => 4990025,
            'currency' => 'COP', 'status' => 'APPROVED', 'payment_method_type' => 'PSE'];
        $voided = array_replace($transaction, ['status' => 'VOIDED']);
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()
            ->push(['data' => $transaction])->push(['data' => $transaction])->push(['data' => $voided])->push(['data' => $voided])]);
        $timestamp = time();
        $event = ['event' => 'transaction.updated', 'environment' => 'test', 'timestamp' => $timestamp,
            'data' => ['transaction' => $transaction], 'signature' => [
                'properties' => ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
                'checksum' => hash('sha256', 'test-membership-123APPROVED4990025'.$timestamp.'test_events_local'),
            ]];
        $this->postJson('/api/v2/webhooks/wompi', $event)->assertOk();
        $membership = ClientMembership::where('payment_reference', 'WOMPI:MEMBERSHIP:'.$order->id)->firstOrFail();
        $this->assertSame('ACTIVE', $membership->status);
        $this->assertSame($user->id, $membership->client->user_id);
        $this->assertSame(3, $membership->appointments_remaining);
        $this->assertSame('49900.25', $membership->plan_snapshot['price']);
        $this->assertSame('10.00', $membership->plan_snapshot['discount_percentage']);
        $this->assertSame('APPROVED', $order->fresh()->status);
        $membership->update(['appointments_used' => 1, 'appointments_remaining' => 2]);
        $this->postJson('/api/v2/webhooks/wompi', $event)->assertOk();
        $this->assertSame(1, ClientMembership::count());
        $this->assertSame(2, $membership->fresh()->appointments_remaining);
        $this->postJson('/api/v2/wompi/membership', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/wompi/orders/'.$order->id)->assertNotFound();
        $event['data']['transaction'] = $voided;
        $event['signature']['checksum'] = hash('sha256', 'test-membership-123VOIDED4990025'.$timestamp.'test_events_local');
        $this->postJson('/api/v2/webhooks/wompi', $event)->assertOk();
        $this->postJson('/api/v2/webhooks/wompi', $event)->assertOk();
        $this->assertSame('SUSPENDED', $membership->fresh()->status);
        $this->assertSame(2, $membership->fresh()->appointments_remaining);
        $this->assertSame('REVIEW', $order->fresh()->status);
        $this->assertSame(1, ClientMembership::count());
    }

    public function test_only_clients_can_buy_active_paid_cop_plans(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $plan = $this->plan();
        $this->postJson('/api/v2/wompi/membership', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $plan->update(['is_active' => false]);
        $this->postJson('/api/v2/wompi/membership', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertNotFound();
        $plan->update(['is_active' => true, 'price' => 0]);
        $this->postJson('/api/v2/wompi/membership', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        $plan->update(['price' => 100, 'currency' => 'USD']);
        $this->postJson('/api/v2/wompi/membership', ['plan_id' => $plan->id, 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        $this->assertSame(0, CheckoutOrder::count());
        Http::assertNothingSent();
    }
}
