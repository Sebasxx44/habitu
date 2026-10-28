<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Finance\Models\CheckoutOrder;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ReservationCheckoutConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    public function runDatabaseMigrations(): void
    {
        $this->assertSame('elegantbarb_test', DB::connection()->getDatabaseName());
        $this->refreshTestDatabase();
        // Workers need committed fixtures. The next test rebuilds its isolated database;
        // migration rollback is unsuitable for cross-schema indexes in legacy migrations.
        $this->beforeApplicationDestroyed(fn () => \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = false);
    }

    public function test_two_processes_cannot_sell_the_same_inventory(): void
    {
        $this->assertSame('elegantbarb_test', DB::connection()->getDatabaseName());
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Calle 1', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'direct', 'requires_professional' => false,
            'duration_minutes' => 60, 'buffer_minutes' => 0, 'requires_confirmation' => false]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        BookingPaymentPolicy::create(['business_id' => $business->id, 'allowed_modes' => ['FULL'], 'hold_minutes' => 15,
            'cancellation_terms' => 'Condiciones de cancelación del negocio.', 'updated_by' => $business->owner_user_id]);
        $booking = ['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'date' => '2026-10-05', 'start_time' => '10:00', 'expected_total' => '30000.00', 'payment_mode' => 'FULL',
            'accepted_terms' => true, 'expected_policy_version' => 1];
        $worker = <<<'PHP'
require $argv[3].'/vendor/autoload.php';
$app = require $argv[3].'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (Illuminate\Support\Facades\DB::connection()->getDatabaseName() !== 'elegantbarb_test') exit(90);
Carbon\Carbon::setTestNow(Carbon\Carbon::parse('2026-10-03 12:00:00', 'UTC'));
config(['services.wompi.environment' => 'test', 'services.wompi.public_key' => 'pub_test_local', 'services.wompi.private_key' => 'prv_test_local',
    'services.wompi.integrity_secret' => 'test_integrity_local', 'services.wompi.events_secret' => 'test_events_local', 'services.wompi.frontend_url' => 'https://habitu.test']);
Illuminate\Support\Facades\Http::preventStrayRequests();
try {
    app(App\Modules\Finance\Services\ReservationCheckoutService::class)->create(App\Models\User::findOrFail((int) $argv[2]), json_decode($argv[1], true, 512, JSON_THROW_ON_ERROR));
    echo 'CREATED';
} catch (Illuminate\Validation\ValidationException $exception) {
    echo array_key_exists('start_time', $exception->errors()) ? 'CONFLICT' : json_encode($exception->errors());
}
PHP;
        $env = ['APP_ENV' => 'testing', 'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            'DB_CONNECTION' => 'pgsql', 'DB_URL' => '', 'DATABASE_URL' => '', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => '55439',
            'DB_DATABASE' => 'elegantbarb_test', 'DB_USERNAME' => 'elegantbarb_test', 'DB_PASSWORD' => 'isolated_test_only',
            'CACHE_DRIVER' => 'array', 'MAIL_MAILER' => 'array', 'QUEUE_CONNECTION' => 'sync', 'REALTIME_ENABLED' => 'false'];
        $processes = [];
        foreach ([1, 2] as $attempt) {
            $user = User::factory()->create(['role' => 'CLIENTE']);
            $processes[] = new Process([PHP_BINARY, '-r', $worker, json_encode($booking + ['idempotency_key' => (string) Str::uuid()], JSON_THROW_ON_ERROR), (string) $user->id, base_path()], base_path(), $env, null, 20);
        }
        // Both processes contend for this committed branch on independent PostgreSQL sessions.
        DB::beginTransaction();
        DB::table('business.business_branches')->where('id', $branch->id)->lockForUpdate()->first();
        try {
            foreach ($processes as $process) $process->start();
            usleep(300000);
        } finally {
            DB::commit();
        }
        $results = [];
        foreach ($processes as $process) {
            $process->wait();
            $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput().$process->getOutput());
            $results[] = $process->getOutput();
        }
        sort($results);
        $this->assertSame(['CONFLICT', 'CREATED'], $results);
        $this->assertSame(1, Appointment::count());
        $this->assertSame(1, CheckoutOrder::count());
    }
}
