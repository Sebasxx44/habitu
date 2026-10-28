<?php

namespace App\Http\Controllers;

use App\Core\DTOs\ServiceResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    public function __invoke()
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
        ];

        $allHealthy = collect($checks)->every(fn ($c) => $c['healthy']);

        $response = [
            'status' => $allHealthy ? 'healthy' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'version' => config('app.version', '1.0.0'),
            'checks' => $checks,
        ];

        return response()->json($response, $allHealthy ? 200 : 503);
    }

    protected function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            return ['healthy' => true, 'latency_ms' => $this->measureLatency(fn () => DB::select('SELECT 1'))];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'error' => 'Dependencia no disponible'];
        }
    }

    protected function checkRedis(): array
    {
        $usesRedis = in_array('redis', [
            config('cache.default'),
            config('queue.default'),
            config('session.driver'),
            config('broadcasting.default'),
        ], true);

        if (! $usesRedis) {
            return ['healthy' => true, 'skipped' => true, 'reason' => 'Redis no configurado'];
        }

        try {
            Redis::ping();
            return ['healthy' => true, 'latency_ms' => $this->measureLatency(fn () => Redis::ping())];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'error' => 'Dependencia no disponible'];
        }
    }

    protected function checkQueue(): array
    {
        if (config('queue.default') === 'sync') {
            return ['healthy' => true, 'skipped' => true, 'driver' => 'sync'];
        }

        try {
            $failedTable = (string) config('queue.failed.table');
            $failed = \Illuminate\Support\Facades\Schema::hasTable($failedTable) ? DB::table($failedTable)->count() : null;
            $pending = \Illuminate\Support\Facades\Queue::size();
            return [
                'healthy' => true,
                'pending_jobs' => $pending,
                'failed_jobs' => $failed,
            ];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'error' => 'Dependencia no disponible'];
        }
    }

    protected function checkStorage(): array
    {
        try {
            $path = storage_path('framework/cache');
            $writable = is_writable($path);
            $free = disk_free_space($path);
            return [
                'healthy' => $writable && $free > 1024 * 1024 * 100,
                'writable' => $writable,
                'free_bytes' => $free,
            ];
        } catch (\Throwable $e) {
            return ['healthy' => false, 'error' => 'Dependencia no disponible'];
        }
    }

    protected function measureLatency(callable $fn): float
    {
        $start = microtime(true);
        $fn();
        return round((microtime(true) - $start) * 1000, 2);
    }
}
