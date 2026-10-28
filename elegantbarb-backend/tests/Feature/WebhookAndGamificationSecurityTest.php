<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Platform\Models\GamificationXP;
use App\Services\WebhookDestinationService;
use App\Services\WebhookService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class WebhookAndGamificationSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_destination_requires_exact_https_allowed_host_and_all_public_addresses(): void
    {
        config(['services.webhooks.allowed_hosts' => ['events.example.test']]);
        $destinations = Mockery::mock(WebhookDestinationService::class)->makePartial()->shouldAllowMockingProtectedMethods();
        $destinations->shouldReceive('addresses')->with('events.example.test')->andReturn(['93.184.216.34', '127.0.0.1']);
        foreach (['http://events.example.test/hook', 'https://events.example.test.attacker.test/hook',
            'https://user:pass@events.example.test/hook', 'https://events.example.test:8443/hook',
            'https://127.0.0.1/hook', 'https://events.example.test/hook'] as $url) {
            try {
                $destinations->resolve($url);
                $this->fail('Unsafe destination was accepted.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('url', $exception->errors());
            }
        }
    }

    public function test_webhook_dispatch_requires_owner_pins_destination_and_signs_exact_body(): void
    {
        Http::preventStrayRequests();
        Http::fake(['https://events.example.test/hook' => function ($request, $options) {
            $this->assertFalse($options['allow_redirects']);
            $this->assertSame('', $options['proxy']);
            $this->assertSame(['events.example.test:443:93.184.216.34'], $options['curl'][CURLOPT_RESOLVE]);
            return Http::response('', 204);
        }]);
        $user = User::factory()->create();
        $other = User::factory()->create();
        foreach ([$user, $other] as $owner) DB::table('platform.outgoing_webhooks')->insert([
            'user_id' => $owner->id, 'name' => 'Eventos', 'url' => 'https://events.example.test/hook',
            'secret' => 'test-only-secret', 'events' => '["*"]', 'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $destinations = Mockery::mock(WebhookDestinationService::class);
        $destinations->shouldReceive('resolve')->once()->with('https://events.example.test/hook')
            ->andReturn(['host' => 'events.example.test', 'address' => '93.184.216.34']);
        $service = new WebhookService($destinations);
        $service->dispatch('booking.created', ['reference' => '/citas/1']);
        Http::assertNothingSent();
        $service->dispatch('booking.created', ['reference' => '/citas/1'], $user->id);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->header('X-Webhook-Signature')[0] === 'sha256='.hash_hmac('sha256', $request->body(), 'test-only-secret'));
        $this->assertSame(1, DB::table('platform.webhook_deliveries')->count());
        $this->assertSame(204, DB::table('platform.webhook_deliveries')->value('status_code'));
    }

    public function test_xp_requires_source_and_cannot_repeat_awards(): void
    {
        $user = User::factory()->create();
        $service = app(\App\Modules\Platform\Services\GamificationService::class);
        $this->assertSame(422, $service->awardXP($user->id, 10, 'TEST')->statusCode);
        $this->assertSame(201, $service->awardXP($user->id, 10, 'TEST', null, $user)->statusCode);
        $this->assertSame(200, $service->awardXP($user->id, 50, 'TEST', null, $user)->statusCode);
        $this->assertSame(10, (int) GamificationXP::where('user_id', $user->id)->sum('points'));
    }

    public function test_leaderboard_is_read_only_current_and_omits_email(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($user);
        GamificationXP::create(['user_id' => $user->id, 'points' => 10, 'action' => 'APPOINTMENT_COMPLETED', 'source_type' => User::class, 'source_id' => $user->id]);
        $this->getJson('/api/v2/gamification/leaderboard')->assertOk()->assertJsonPath('data.0.total_points', 10)
            ->assertJsonPath('data.0.user.name', $user->name)->assertJsonMissingPath('data.0.user.email');
        GamificationXP::create(['user_id' => $user->id, 'points' => 5, 'action' => 'APPOINTMENT_COMPLETED', 'source_type' => User::class, 'source_id' => $user->id]);
        $this->getJson('/api/v2/gamification/leaderboard')->assertOk()->assertJsonPath('data.0.total_points', 15);
        $this->assertSame(0, DB::table('platform.leaderboards')->count());
        $this->getJson('/api/v2/gamification/leaderboard?period=INVALID')->assertUnprocessable();
    }
}
