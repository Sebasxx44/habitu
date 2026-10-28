<?php

namespace Tests\Feature;

use App\Jobs\Booking\SendBookingEmail;
use Illuminate\Bus\BatchRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ProductionRuntimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_cache_persists_values_expires_and_serializes_exclusive_locks(): void
    {
        // Lock contention must use autocommit, independently from RefreshDatabase's wrapping transaction.
        config(['database.connections.runtime_test_locks' => config('database.connections.pgsql'),
            'cache.stores.database.lock_connection' => 'runtime_test_locks']);
        $cache = Cache::store('database');
        $this->assertTrue($cache->put('runtime-verification', ['ready' => true], 60));
        $this->assertSame(['ready' => true], $cache->get('runtime-verification'));
        $this->assertDatabaseCount('platform.runtime_cache', 1);

        $lock = $cache->lock('runtime-exclusive', 60);
        $contender = $cache->lock('runtime-exclusive', 60);
        try {
            $this->assertTrue($lock->get());
            $this->assertFalse($contender->get());
            $this->assertTrue($lock->release());
            $this->assertTrue($contender->get());
            $this->assertTrue($contender->release());
        } finally {
            $lock->forceRelease();
            DB::purge('runtime_test_locks');
        }

        $this->travel(61)->seconds();
        $this->assertNull($cache->get('runtime-verification'));
        $this->travelBack();
    }

    public function test_database_queue_reserves_and_deletes_jobs_from_the_configured_runtime_table(): void
    {
        $queue = Queue::connection('database');
        $queueName = 'runtime-verification';
        $this->assertSame(0, $queue->size($queueName));
        $id = $queue->push(new SendBookingEmail(0), '', $queueName);
        $this->assertNotNull($id);
        $this->assertSame(1, $queue->size($queueName));
        $this->assertDatabaseHas('platform.runtime_jobs', ['id' => $id, 'queue' => $queueName, 'attempts' => 0]);

        $job = $queue->pop($queueName);
        $this->assertNotNull($job);
        $this->assertSame(1, $job->attempts());
        $this->assertSame(SendBookingEmail::class, $job->payload()['data']['commandName']);
        $this->assertNull($queue->pop($queueName));
        $job->delete();
        $this->assertSame(0, $queue->size($queueName));
        $this->assertDatabaseMissing('platform.runtime_jobs', ['id' => $id]);
    }

    public function test_database_failed_job_provider_uses_the_configured_table(): void
    {
        $uuid = Str::uuid()->toString();
        $payload = json_encode(['uuid' => $uuid, 'displayName' => 'RuntimeVerification'], JSON_THROW_ON_ERROR);
        $provider = app('queue.failer');
        $this->assertSame($uuid, $provider->log('database', 'runtime-verification', $payload, 'Controlled runtime failure'));
        $this->assertDatabaseHas('platform.runtime_failed_jobs', ['uuid' => $uuid, 'queue' => 'runtime-verification']);
        $this->assertNotNull($provider->find($uuid));
        $this->assertTrue($provider->forget($uuid));
        $this->assertDatabaseMissing('platform.runtime_failed_jobs', ['uuid' => $uuid]);
    }

    public function test_database_batches_can_be_created_retrieved_cancelled_and_deleted(): void
    {
        $batch = Bus::batch([])->name('Runtime verification')->onConnection('database')->dispatch();
        $this->assertDatabaseHas('platform.runtime_job_batches', ['id' => $batch->id, 'name' => 'Runtime verification']);
        $restored = Bus::findBatch($batch->id);
        $this->assertNotNull($restored);
        $this->assertSame(0, $restored->totalJobs);
        $restored->cancel();
        $this->assertTrue(Bus::findBatch($batch->id)->cancelled());
        app(BatchRepository::class)->delete($batch->id);
        $this->assertNull(Bus::findBatch($batch->id));
    }

    public function test_database_sessions_survive_new_handlers_and_expired_sessions_are_unreadable(): void
    {
        $session = Session::driver('database');
        $session->start();
        $session->put('return_to', '/cliente');
        $session->save();
        $id = $session->getId();
        $this->assertDatabaseHas('platform.runtime_sessions', ['id' => $id]);

        Session::forgetDrivers();
        $restored = Session::driver('database');
        $restored->setId($id);
        $restored->start();
        $this->assertSame('/cliente', $restored->get('return_to'));
        DB::table('platform.runtime_sessions')->where('id', $id)->update([
            'last_activity' => now()->subMinutes((int) config('session.lifetime') + 1)->timestamp,
        ]);

        Session::forgetDrivers();
        $expired = Session::driver('database');
        $expired->setId($id);
        $expired->start();
        $this->assertNull($expired->get('return_to'));
        $expired->invalidate();
        $this->assertDatabaseMissing('platform.runtime_sessions', ['id' => $id]);
    }

    public function test_cors_exposes_auth_configuration_only_to_an_allowed_browser_origin(): void
    {
        config(['cors.allowed_origins' => ['https://app.example.test']]);
        $this->withHeader('Origin', 'https://app.example.test')->getJson('/api/auth/config')
            ->assertOk()->assertHeader('Access-Control-Allow-Origin', 'https://app.example.test')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
        $denied = $this->withHeader('Origin', 'https://untrusted.example.test')->getJson('/api/auth/config')->assertOk();
        $this->assertNotSame('https://untrusted.example.test', $denied->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $denied->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_cors_preflight_allows_registration_only_for_a_configured_origin(): void
    {
        config(['cors.allowed_origins' => ['https://app.example.test']]);
        $this->withHeaders(['Origin' => 'https://app.example.test', 'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,authorization'])
            ->options('/api/auth/register')->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://app.example.test')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
        $denied = $this->withHeader('Origin', 'https://untrusted.example.test')->options('/api/auth/register');
        $this->assertNotSame('https://untrusted.example.test', $denied->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $denied->headers->get('Access-Control-Allow-Origin'));
    }
}
