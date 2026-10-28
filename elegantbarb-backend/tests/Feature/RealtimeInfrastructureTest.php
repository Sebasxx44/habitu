<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Realtime\Events\ResourceChanged;
use App\Modules\Realtime\Services\ResourceChangePublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RealtimeInfrastructureTest extends TestCase
{
    use RefreshDatabase;

    public function test_private_channels_reject_other_accounts_and_businesses(): void
    {
        config(['broadcasting.default' => 'pusher', 'broadcasting.connections.pusher.key' => 'test-key',
            'broadcasting.connections.pusher.secret' => 'test-secret', 'broadcasting.connections.pusher.app_id' => 'test-app']);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create();
        Sanctum::actingAs($owner);
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-user.'.$owner->id, 'socket_id' => '123.456'])->assertOk();
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-user.99999', 'socket_id' => '123.456'])->assertForbidden();
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-business.'.$business->id, 'socket_id' => '123.456'])->assertOk();
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-business.'.$foreign->id, 'socket_id' => '123.456'])->assertForbidden();
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-platform', 'socket_id' => '123.456'])->assertForbidden();
    }

    public function test_batch_invalidates_tenant_owner_and_public_catalog_without_leaking_records(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        config(['realtime.enabled' => true]);
        Event::fake([ResourceChanged::class]);
        $publisher = app(ResourceChangePublisher::class);
        $publisher->begin();
        $publisher->record('business.business_branches', [['business_id' => $business->id, 'name' => 'Confidential address']]);
        $publisher->record('business.business_branches', [['business_id' => $business->id]]);
        $publisher->finish(true);
        Event::assertDispatched(ResourceChanged::class, fn ($event) => $event->channels === ['user.'.$owner->id] && in_array('branches', $event->topics, true));
        Event::assertDispatched(ResourceChanged::class, fn ($event) => $event->channels === ['business.'.$business->id]);
        Event::assertDispatched(ResourceChanged::class, fn ($event) => $event->channels === ['marketplace'] && !str_contains(json_encode($event->broadcastWith()), 'Confidential'));
        Event::assertDispatched(ResourceChanged::class, 5);
    }

    public function test_rolled_back_model_changes_do_not_broadcast(): void
    {
        $business = Business::factory()->create();
        config(['realtime.enabled' => true]);
        Event::fake([ResourceChanged::class]);
        DB::beginTransaction();
        BusinessBranch::create(['business_id' => $business->id, 'name' => 'Rollback', 'address' => 'Never visible']);
        DB::rollBack();
        Event::assertNotDispatched(ResourceChanged::class);
    }

    public function test_bulk_notification_updates_notify_only_actor_and_platform(): void
    {
        $actor = User::factory()->create();
        config(['realtime.enabled' => true]);
        Event::fake([ResourceChanged::class]);
        $publisher = app(ResourceChangePublisher::class);
        $publisher->begin();
        $publisher->finish(true, $actor, ['marketing.notifications']);
        Event::assertDispatched(ResourceChanged::class, fn ($event) => $event->channels === ['user.'.$actor->id] && $event->topics === ['notifications']);
        Event::assertNotDispatched(ResourceChanged::class, fn ($event) => in_array('marketplace', $event->channels, true));
    }
    public function test_client_channel_authorization_supports_multiple_business_profiles(): void
    {
        config(['broadcasting.default' => 'pusher', 'broadcasting.connections.pusher.key' => 'test-key',
            'broadcasting.connections.pusher.secret' => 'test-secret', 'broadcasting.connections.pusher.app_id' => 'test-app']);
        Broadcast::forgetDrivers();
        require base_path('routes/channels.php');
        $user = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $first = \App\Modules\People\Models\Client::factory()->create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id]);
        $second = \App\Modules\People\Models\Client::factory()->create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id]);
        Sanctum::actingAs($user);
        foreach ([$first, $second] as $client) {
            $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-client.'.$client->id, 'socket_id' => '123.456'])->assertOk();
        }
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-client.999999', 'socket_id' => '123.456'])->assertForbidden();
        // The tracking query must return a clean denial, not a scalar-subquery cardinality error.
        $this->postJson('/api/broadcasting/auth', ['channel_name' => 'private-tracking.professional.999999', 'socket_id' => '123.456'])->assertForbidden();
    }

}
