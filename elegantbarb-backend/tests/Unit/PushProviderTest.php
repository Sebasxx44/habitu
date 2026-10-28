<?php

namespace Tests\Unit;

use App\Services\PushNotificationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class PushProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['push.enabled' => true, 'push.project_id' => 'test-project', 'push.client_email' => 'test@example.test', 'push.private_key' => 'never-a-real-key']);
        Cache::put('push.oauth.'.hash('sha256', 'test@example.test'), 'test-access-token', 300);
        Http::preventStrayRequests();
    }

    public function test_http_v1_uses_stable_event_and_never_labels_acceptance_as_read(): void
    {
        Http::fake(['fcm.googleapis.com/*' => Http::response(['name' => 'projects/test/messages/fcm-id'])]);
        $this->assertTrue(app(PushNotificationService::class)->sendToToken('test-device-token', 'habitu', 'Tienes una novedad.', ['event_id' => 'notification-10']));
        Http::assertSent(fn ($request) => data_get($request->data(), 'message.data.event_id') === 'notification-10'
            && data_get($request->data(), 'message.token') === 'test-device-token'
            && ! array_key_exists('read', $request->data()['message']));
    }

    public function test_exception_logging_excludes_token_payload_and_exception_message(): void
    {
        Log::spy();
        Http::fake(['fcm.googleapis.com/*' => function () { throw new \RuntimeException('sensitive-device-token and private-body in HTTP error'); }]);
        $this->assertFalse(app(PushNotificationService::class)->sendToToken('sensitive-device-token', 'Title', 'private-body'));
        Log::shouldHaveReceived('warning')->once()->with('Push provider request failed', ['exception' => \RuntimeException::class]);
        Log::shouldNotHaveReceived('error');
    }

    public function test_invalid_private_key_is_logged_without_secret_or_provider_call(): void
    {
        Cache::forget('push.oauth.'.hash('sha256', 'test@example.test'));
        Log::spy();
        $this->assertFalse(app(PushNotificationService::class)->sendToToken('device', 'Title', 'Body'));
        Log::shouldHaveReceived('warning')->once()->with('Push provider authentication failed', \Mockery::on(fn ($context) => array_keys($context) === ['exception']));
        Http::assertNothingSent();
    }
}
