<?php

namespace Tests\Feature;

use App\Jobs\SyncGoogleCalendarBusy;
use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Services\GoogleCalendarBusyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CalendarPushConnectionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_calendar_import_paginates_without_storing_private_details_and_handles_410(): void
    {
        [$user, $professional] = $this->professional();
        $this->token($professional);
        Http::preventStrayRequests();
        Http::fake(['www.googleapis.com/calendar/v3/calendars/primary/events*' => Http::sequence()
            ->push(['items' => [['id' => 'external', 'summary' => 'Privado', 'start' => ['dateTime' => now()->addDay()->toIso8601String()], 'end' => ['dateTime' => now()->addDay()->addHour()->toIso8601String()]]], 'nextPageToken' => 'page2'])
            ->push(['items' => [], 'nextSyncToken' => 'sync1'])
            ->push([], 410)
            ->push(['items' => [['id' => 'replacement', 'start' => ['date' => now()->addDays(2)->toDateString()], 'end' => ['date' => now()->addDays(3)->toDateString()]]], 'nextSyncToken' => 'sync2'])]);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/google-calendar/sync-busy')->assertOk()->assertJsonPath('data.busy_count', 1);
        $busy = DB::table('platform.google_calendar_busy')->first();
        $this->assertSame('external', $busy->google_event_id);
        $this->assertFalse(property_exists($busy, 'summary'));
        $this->assertDatabaseHas('platform.google_calendar_tokens', ['professional_id' => $professional->id, 'sync_token' => 'sync1']);
        $this->postJson('/api/v2/google-calendar/sync-busy')->assertOk()->assertJsonPath('data.busy_count', 1);
        $this->assertDatabaseMissing('platform.google_calendar_busy', ['google_event_id' => 'external']);
        $this->assertDatabaseHas('platform.google_calendar_busy', ['google_event_id' => 'replacement', 'is_all_day' => true]);
        $this->assertDatabaseCount('people.professional_availability', 0);
        Http::assertSentCount(4);
    }

    public function test_failed_sync_preserves_busy_intervals_and_cannot_access_other_professional(): void
    {
        [$user, $professional] = $this->professional();
        [, $other] = $this->professional();
        $this->token($professional);
        DB::table('platform.google_calendar_busy')->insert(['professional_id' => $professional->id, 'google_event_id' => 'existing', 'starts_at' => now()->addDay(), 'ends_at' => now()->addDay()->addHour(), 'is_all_day' => false, 'created_at' => now(), 'updated_at' => now()]);
        Http::fake(['www.googleapis.com/*' => Http::response([], 503)]);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/google-calendar/sync-busy', ['professional_id' => $other->id])->assertForbidden();
        $this->postJson('/api/v2/google-calendar/sync-busy')->assertStatus(502);
        $this->assertDatabaseHas('platform.google_calendar_busy', ['google_event_id' => 'existing']);
        $this->assertDatabaseHas('platform.google_calendar_tokens', ['sync_error' => 'SYNC_FAILED']);
    }

    public function test_calendar_webhook_checks_channel_secret_resource_expiry_and_replay(): void
    {
        Queue::fake();
        [, $professional] = $this->professional();
        $this->token($professional);
        $channel = (string) Str::uuid();
        DB::table('platform.google_calendar_tokens')->where('professional_id', $professional->id)->update([
            'channel_id' => $channel, 'channel_token_hash' => hash('sha256', 'secret'), 'channel_resource_id' => 'resource', 'channel_expires_at' => now()->addDay(),
        ]);
        $headers = ['X-Goog-Channel-ID' => $channel, 'X-Goog-Channel-Token' => 'bad', 'X-Goog-Resource-ID' => 'resource', 'X-Goog-Message-Number' => '1'];
        $this->postJson('/api/v2/webhooks/google-calendar', [], $headers)->assertForbidden();
        $headers['X-Goog-Channel-Token'] = 'secret';
        $this->postJson('/api/v2/webhooks/google-calendar', [], $headers)->assertOk();
        $this->postJson('/api/v2/webhooks/google-calendar', [], $headers)->assertForbidden();
        Queue::assertPushed(SyncGoogleCalendarBusy::class, 1);
    }

    public function test_push_disabled_without_configuration_and_devices_are_scoped_and_encrypted(): void
    {
        Http::preventStrayRequests();
        $first = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $second = User::factory()->create(['role' => User::ROLE_CLIENT]);
        Sanctum::actingAs($first);
        $this->getJson('/api/v2/push/status')->assertOk()->assertJsonPath('data.configured', false);
        $payload = ['token' => str_repeat('device-token-', 8), 'platform' => 'web', 'transactional_enabled' => true, 'promotions_enabled' => false];
        $this->postJson('/api/v2/push/register', $payload)->assertStatus(503);
        config(['push.enabled' => true, 'push.project_id' => 'test', 'push.client_email' => 'test@example.test', 'push.private_key' => 'test-key']);
        $this->postJson('/api/v2/push/register', $payload)->assertOk();
        $record = DB::table('platform.push_devices')->first();
        $this->assertNotSame($payload['token'], $record->token);
        $this->assertSame($payload['token'], Crypt::decryptString($record->token));
        Sanctum::actingAs($second);
        $this->getJson('/api/v2/push/status')->assertOk()->assertJsonPath('data.registered_devices', 0);
        $this->postJson('/api/v2/push/unregister', ['token' => $payload['token']])->assertOk();
        $this->assertNull(DB::table('platform.push_devices')->first()->revoked_at);
        Sanctum::actingAs($first);
        $this->postJson('/api/v2/push/unregister', ['token' => $payload['token']])->assertOk();
        $this->assertNotNull(DB::table('platform.push_devices')->first()->revoked_at);
        Http::assertNothingSent();
    }

    private function professional(): array
    {
        config(['services.google_calendar.client_id' => 'test-client', 'services.google_calendar.client_secret' => 'test-secret', 'app.url' => 'http://localhost']);
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $business = Business::factory()->create();
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => $business->id, 'name' => $user->name, 'email' => $user->email, 'is_active' => true]);
        return [$user, $professional];
    }

    private function token(Professional $professional): void
    {
        DB::table('platform.google_calendar_tokens')->insert(['professional_id' => $professional->id,
            'access_token' => Crypt::encryptString('access-token'), 'refresh_token' => Crypt::encryptString('refresh-token'),
            'expires_at' => now()->addHour(), 'created_at' => now(), 'updated_at' => now()]);
    }
}
