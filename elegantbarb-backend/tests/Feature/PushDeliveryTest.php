<?php

namespace Tests\Feature;

use App\Jobs\DeliverPushNotification;
use App\Models\User;
use App\Modules\Platform\Models\Notification;
use App\Services\PushDeliveryService;
use App\Services\PushNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_mixed_device_failure_retries_only_unaccepted_device_and_keeps_read_false(): void
    {
        Queue::fake();
        Http::preventStrayRequests();
        config(['push.enabled' => true, 'push.project_id' => 'test-project', 'push.client_email' => 'test@example.test', 'push.private_key' => 'test-key']);
        Cache::put('push.oauth.'.hash('sha256', 'test@example.test'), 'access-token', 300);
        $user = User::factory()->create();
        DB::table('platform.push_preferences')->insert(['user_id' => $user->id, 'transactional_enabled' => true, 'promotions_enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
        $first = $this->device($user, 'first-device');
        $second = $this->device($user, 'second-device');
        $attempts = [];
        Http::fake(['fcm.googleapis.com/*' => function ($request) use (&$attempts) {
            $token = data_get($request->data(), 'message.token');
            $attempts[$token] = ($attempts[$token] ?? 0) + 1;
            return $token === 'second-device' && $attempts[$token] === 1 ? Http::response([], 503) : Http::response(['name' => 'projects/test/messages/'.$token]);
        }]);
        $notification = Notification::create(['user_id' => $user->id, 'type' => 'APPOINTMENT_CONFIRMED', 'title' => 'Private title', 'message' => 'Private appointment details', 'read' => false]);
        $job = new DeliverPushNotification($notification->id);
        try { $job->handle(app(PushNotificationService::class)); $this->fail('Failed device should request a retry.'); }
        catch (\RuntimeException $exception) { $this->assertSame('Push provider did not acknowledge acceptance.', $exception->getMessage()); }
        $this->assertDatabaseHas('platform.push_deliveries', ['device_id' => $first, 'state' => 'ACCEPTED', 'attempts' => 1]);
        $this->assertDatabaseHas('platform.push_deliveries', ['device_id' => $second, 'state' => 'RETRY_PENDING', 'attempts' => 1]);
        $job->handle(app(PushNotificationService::class));
        $job->handle(app(PushNotificationService::class));
        $this->assertSame(['first-device' => 1, 'second-device' => 2], $attempts);
        $this->assertDatabaseHas('platform.push_deliveries', ['device_id' => $second, 'state' => 'ACCEPTED', 'attempts' => 2]);
        $this->assertFalse($notification->fresh()->read);
        Http::assertSentCount(3);
        Http::assertSent(fn ($request) => data_get($request->data(), 'message.data.event_id') === 'notification-'.$notification->id
            && ! str_contains($request->body(), 'Private appointment details'));
    }

    public function test_fresh_claim_prevents_duplicate_send_and_stale_claim_has_bounded_retries(): void
    {
        $user = User::factory()->create();
        $id = $this->device($user, 'claimed-device');
        $device = DB::table('platform.push_devices')->where('id', $id)->first();
        DB::table('platform.push_deliveries')->insert(['device_id' => $id, 'user_id' => $user->id, 'event_id' => 'notification-1',
            'state' => 'SENDING', 'attempts' => 1, 'locked_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $attempts = 0;
        $send = function () use (&$attempts) { $attempts++; return ['accepted' => false, 'permanent' => false, 'message_id' => null]; };
        $service = app(PushDeliveryService::class);
        $this->assertFalse($service->attempt($device, 'notification-1', $send));
        $this->assertSame(0, $attempts);
        $this->travel(3)->minutes();
        $this->assertFalse($service->attempt($device, 'notification-1', $send));
        $this->assertFalse($service->attempt($device, 'notification-1', $send));
        $this->assertTrue($service->attempt($device, 'notification-1', $send));
        $this->assertSame(2, $attempts);
        $this->assertDatabaseHas('platform.push_deliveries', ['device_id' => $id, 'state' => 'FAILED', 'attempts' => 3]);
    }

    public function test_revoked_or_reassigned_device_cannot_receive_old_users_event(): void
    {
        $user = User::factory()->create();
        $id = $this->device($user, 'moved-device');
        $device = DB::table('platform.push_devices')->where('id', $id)->first();
        DB::table('platform.push_devices')->where('id', $id)->update(['user_id' => User::factory()->create()->id]);
        $sent = false;
        $this->assertTrue(app(PushDeliveryService::class)->attempt($device, 'notification-5', function () use (&$sent) { $sent = true; return ['accepted' => true, 'permanent' => false, 'message_id' => 'test']; }));
        $this->assertFalse($sent);
        $this->assertDatabaseCount('platform.push_deliveries', 0);
    }

    private function device(User $user, string $token): int
    {
        return DB::table('platform.push_devices')->insertGetId(['user_id' => $user->id, 'token_hash' => hash('sha256', $token), 'token' => Crypt::encryptString($token),
            'last_seen_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }
}
