<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\OnDemand\Services\OnDemandService;
use App\Modules\Platform\Services\MarketplaceOutbox;
use App\Services\WebhookDestinationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class MarketplaceOutboxTest extends TestCase
{
    use RefreshDatabase;

    public function test_events_deduplicate_by_source_and_fan_out_only_to_subscribed_owner(): void
    {
        Http::preventStrayRequests();
        [$owner, $business] = $this->fixture();
        $hook = $this->webhook($owner);
        $this->webhook(User::factory()->create());
        $this->webhook($owner, ['service.completed']);
        $this->webhook($owner, ['*'], false);
        $outbox = app(MarketplaceOutbox::class);
        $outbox->record('test:booking:1', 'booking.created', $business->id, $owner->id, ['appointment_id' => 12]);
        $outbox->record('test:booking:1', 'booking.created', $business->id, $owner->id, ['appointment_id' => 12]);
        $this->assertSame(1, DB::table('platform.marketplace_outbox')->count());
        $this->assertSame(1, DB::table('platform.webhook_deliveries')->count());
        $this->assertDatabaseHas('platform.webhook_deliveries', ['webhook_id' => $hook, 'state' => 'PENDING', 'attempt' => 0]);
        $outbox->record('test:no-owner', 'booking.created', $business->id, null, ['appointment_id' => 13]);
        $this->assertSame(2, DB::table('platform.marketplace_outbox')->count());
        $this->assertSame(1, DB::table('platform.webhook_deliveries')->count());
        Http::assertNothingSent();
    }

    public function test_domain_rollback_also_rolls_back_event_and_delivery_without_network(): void
    {
        Http::preventStrayRequests();
        [$owner, $business] = $this->fixture();
        $this->webhook($owner);
        try {
            DB::transaction(function () use ($owner, $business) {
                app(MarketplaceOutbox::class)->record('test:rollback', 'booking.created', $business->id, $owner->id, ['appointment_id' => 20]);
                throw new RuntimeException('Domain operation failed');
            });
            $this->fail('Expected rollback.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Domain operation failed', $exception->getMessage());
        }
        $this->assertSame(0, DB::table('platform.marketplace_outbox')->count());
        $this->assertSame(0, DB::table('platform.webhook_deliveries')->count());
        Http::assertNothingSent();
    }

    public function test_delivery_signs_actual_body_retries_with_stable_event_and_replay_requires_owner(): void
    {
        Http::preventStrayRequests();
        Http::fake(['https://events.example.test/hook' => Http::sequence()->push('unavailable', 503)->push('', 204)]);
        $destinations = Mockery::mock(WebhookDestinationService::class);
        $destinations->shouldReceive('resolve')->twice()->with('https://events.example.test/hook')->andReturn(['host' => 'events.example.test', 'address' => '93.184.216.34']);
        $this->app->instance(WebhookDestinationService::class, $destinations);
        [$owner, $business] = $this->fixture();
        $this->webhook($owner);
        $outbox = app(MarketplaceOutbox::class);
        $outbox->record('test:retry', 'booking.created', $business->id, $owner->id, ['appointment_id' => 21]);
        $eventId = DB::table('platform.marketplace_outbox')->value('id');
        $delivery = DB::table('platform.webhook_deliveries')->first();
        $this->assertSame(1, $outbox->process());
        $this->assertDatabaseHas('platform.webhook_deliveries', ['id' => $delivery->id, 'state' => 'PENDING', 'attempt' => 1, 'status_code' => 503]);
        $this->assertSame(0, $outbox->process());
        $this->travel(31)->seconds();
        $this->assertSame(1, $outbox->process());
        $this->assertDatabaseHas('platform.webhook_deliveries', ['id' => $delivery->id, 'state' => 'DELIVERED', 'attempt' => 2, 'status_code' => 204]);
        Http::assertSentCount(2);
        foreach (Http::recorded() as [$request]) {
            $this->assertSame('sha256='.hash_hmac('sha256', $request->body(), 'test-only-secret'), $request->header('X-Webhook-Signature')[0]);
            $this->assertSame($eventId, json_decode($request->body(), true)['id']);
        }
        Sanctum::actingAs($owner);
        $this->postJson('/api/v2/webhooks/deliveries/'.$delivery->id.'/replay')->assertConflict();
        DB::table('platform.webhook_deliveries')->where('id', $delivery->id)->update(['state' => 'FAILED', 'attempt' => 5]);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->postJson('/api/v2/webhooks/deliveries/'.$delivery->id.'/replay')->assertNotFound();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v2/webhooks/deliveries/'.$delivery->id.'/replay')->assertOk();
        $this->assertDatabaseHas('platform.webhook_deliveries', ['id' => $delivery->id, 'state' => 'PENDING', 'attempt' => 0]);
    }

    public function test_worker_recovers_stale_leases_and_suppresses_disabled_destinations(): void
    {
        Http::preventStrayRequests();
        [$owner, $business] = $this->fixture();
        $hook = $this->webhook($owner);
        $outbox = app(MarketplaceOutbox::class);
        $outbox->record('test:stale', 'booking.created', $business->id, $owner->id, ['appointment_id' => 22]);
        $delivery = DB::table('platform.webhook_deliveries')->first();
        DB::table('platform.webhook_deliveries')->where('id', $delivery->id)->update(['state' => 'PROCESSING', 'attempt' => 5, 'locked_at' => now()->subMinutes(6)]);
        $this->assertSame(0, $outbox->process());
        $this->assertDatabaseHas('platform.webhook_deliveries', ['id' => $delivery->id, 'state' => 'FAILED', 'locked_at' => null]);
        $outbox->replay($owner, $delivery->id);
        DB::table('platform.webhook_deliveries')->where('id', $delivery->id)->update(['state' => 'PROCESSING', 'attempt' => 1, 'locked_at' => now()->subMinutes(6)]);
        DB::table('platform.outgoing_webhooks')->where('id', $hook)->update(['active' => false]);
        $this->assertSame(1, $outbox->process());
        $this->assertDatabaseHas('platform.webhook_deliveries', ['id' => $delivery->id, 'state' => 'SUPPRESSED', 'attempt' => 2]);
        Http::assertNothingSent();
    }

    public function test_on_demand_service_events_are_transactional_deduplicated_and_omit_location(): void
    {
        Http::preventStrayRequests();
        [$owner, $business] = $this->fixture();
        $this->webhook($owner);
        $request = OnDemandRequest::factory()->create(['business_id' => $business->id, 'status' => 'ON_THE_WAY']);
        $service = app(OnDemandService::class);
        $this->assertSame(200, $service->updateStatus($request->id, 'IN_PROGRESS', $owner->id)->statusCode);
        $this->assertSame(200, $service->updateStatus($request->id, 'COMPLETED', $owner->id)->statusCode);
        $service->updateStatus($request->id, 'COMPLETED', $owner->id);
        $this->assertSame(2, DB::table('platform.marketplace_outbox')->count());
        $this->assertSame(2, DB::table('platform.webhook_deliveries')->count());
        $this->assertDatabaseHas('platform.marketplace_outbox', ['source_key' => 'on-demand:'.$request->id.':IN_PROGRESS', 'event' => 'service.started']);
        $row = DB::table('platform.marketplace_outbox')->where('event', 'service.completed')->first();
        $payload = json_decode($row->payload, true);
        $this->assertSame($request->id, $payload['data']['on_demand_request_id']);
        $this->assertArrayNotHasKey('client_address', $payload['data']);
        $this->assertArrayNotHasKey('client_lat', $payload['data']);
        $this->assertArrayNotHasKey('client_id', $payload['data']);
        Http::assertNothingSent();
    }

    private function fixture(): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        return [$owner, Business::factory()->create(['owner_user_id' => $owner->id])];
    }

    private function webhook(User $owner, array $events = ['*'], bool $active = true): int
    {
        return DB::table('platform.outgoing_webhooks')->insertGetId(['user_id' => $owner->id, 'name' => 'Eventos', 'url' => 'https://events.example.test/hook',
            'secret' => 'test-only-secret', 'events' => json_encode($events), 'active' => $active, 'created_at' => now(), 'updated_at' => now()]);
    }
}
