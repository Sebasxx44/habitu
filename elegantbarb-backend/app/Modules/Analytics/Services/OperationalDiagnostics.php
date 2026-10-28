<?php

namespace App\Modules\Analytics\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class OperationalDiagnostics
{
    private const SIGNALS = ['scheduler' => 180, 'outbox' => 180, 'payments' => 900, 'checkout_expiry' => 180, 'queue' => null];

    public function record(string $name, string $status = 'OBSERVED'): void
    {
        if (! array_key_exists($name, self::SIGNALS) || ! in_array($status, ['OBSERVED', 'RUNNING', 'SUCCEEDED', 'FAILED'], true)) return;
        // Diagnostics must not interrupt a business task or log sensitive exceptions.
        try {
            if (! Schema::hasTable('platform.operational_heartbeats')) return;
            $values = ['status' => $status, 'last_seen_at' => now()];
            $column = match ($status) { 'RUNNING' => 'last_started_at', 'SUCCEEDED' => 'last_succeeded_at', 'FAILED' => 'last_failed_at', default => null };
            if ($column) $values[$column] = now();
            DB::table('platform.operational_heartbeats')->upsert([['name' => $name] + $values], ['name'], array_keys($values));
        } catch (\Throwable) {
            // Absence of a signal remains visible as missing or stale evidence.
        }
    }

    public function run(string $name, callable $action): mixed
    {
        $this->record($name, 'RUNNING');
        try {
            $result = $action();
            $this->record($name, 'SUCCEEDED');
            return $result;
        } catch (\Throwable $exception) {
            $this->record($name, 'FAILED');
            throw $exception;
        }
    }

    public function snapshot(): array
    {
        $rows = Schema::hasTable('platform.operational_heartbeats') ? DB::table('platform.operational_heartbeats')->get()->keyBy('name') : collect();
        $signals = [];
        foreach (self::SIGNALS as $name => $staleSeconds) {
            $row = $rows->get($name);
            $signals[] = ['name' => $name, 'status' => $row?->status ?? 'NO_EVIDENCE', 'last_seen_at' => $row?->last_seen_at ? CarbonImmutable::parse($row->last_seen_at)->toIso8601String() : null,
                'last_succeeded_at' => $row?->last_succeeded_at ? CarbonImmutable::parse($row->last_succeeded_at)->toIso8601String() : null, 'last_failed_at' => $row?->last_failed_at ? CarbonImmutable::parse($row->last_failed_at)->toIso8601String() : null,
                'stale' => $row && $staleSeconds !== null ? CarbonImmutable::parse($row->last_seen_at)->lt(now()->subSeconds($staleSeconds)) : null];
        }
        $connection = config('queue.default');
        $driver = config("queue.connections.{$connection}.driver", $connection);
        $queue = ['driver' => in_array($driver, ['sync', 'database', 'redis', 'sqs', 'beanstalkd', 'null'], true) ? $driver : 'other', 'pending' => null, 'reserved' => null, 'failed' => null];
        $table = config("queue.connections.{$connection}.table", 'jobs');
        if ($driver === 'database' && Schema::hasTable($table)) {
            $queue['pending'] = DB::table($table)->whereNull('reserved_at')->count();
            $queue['reserved'] = DB::table($table)->whereNotNull('reserved_at')->count();
        }
        $failedTable = config('queue.failed.table', 'failed_jobs');
        if (str_starts_with((string) config('queue.failed.driver'), 'database') && Schema::hasTable($failedTable)) $queue['failed'] = DB::table($failedTable)->count();
        $deliveries = DB::table('platform.webhook_deliveries')->whereNotNull('outbox_id');
        $outbox = ['pending' => (clone $deliveries)->where('state', 'PENDING')->count(), 'processing' => (clone $deliveries)->where('state', 'PROCESSING')->count(),
            'failed' => (clone $deliveries)->where('state', 'FAILED')->count(), 'delivered' => (clone $deliveries)->where('state', 'DELIVERED')->count(),
            'oldest_pending_at' => (clone $deliveries)->whereIn('state', ['PENDING', 'PROCESSING'])->min('created_at')];
        $mailer = config('mail.default');
        $mailTransport = config("mail.mailers.{$mailer}.transport", $mailer);
        $mailConfigured = match ($mailTransport) {
            'smtp' => (bool) config("mail.mailers.{$mailer}.host") && (bool) config('mail.from.address'),
            'ses' => $this->configured(['services.ses.key', 'services.ses.secret']),
            'mailgun' => $this->configured(['services.mailgun.domain', 'services.mailgun.secret']),
            'postmark' => $this->configured(['services.postmark.token']),
            default => false,
        };
        return ['observed_at' => now()->toIso8601String(), 'signals' => $signals, 'queue' => $queue, 'outbox' => $outbox,
            'providers' => [
                ['name' => 'email', 'configured' => $mailConfigured, 'enabled' => (bool) config('booking.email_enabled'), 'mode' => in_array($mailTransport, ['smtp', 'ses', 'mailgun', 'postmark', 'log', 'array', 'sendmail'], true) ? $mailTransport : 'other'],
                ['name' => 'payments', 'configured' => $this->configured(['services.wompi.public_key', 'services.wompi.private_key', 'services.wompi.integrity_secret', 'services.wompi.events_secret']), 'enabled' => null, 'mode' => match (config('services.wompi.environment')) { 'prod' => 'production', 'test' => 'test', default => 'invalid' }],
                ['name' => 'calendar', 'configured' => $this->configured(['services.google_calendar.client_id', 'services.google_calendar.client_secret', 'services.google_calendar.redirect_uri']), 'enabled' => null, 'mode' => 'oauth'],
                ['name' => 'push', 'configured' => $this->configured(['push.project_id', 'push.client_email', 'push.private_key', 'push.vapid_key']), 'enabled' => (bool) config('push.enabled'), 'mode' => 'fcm'],
                ['name' => 'webhooks', 'configured' => count(config('services.webhooks.allowed_hosts', [])) > 0, 'enabled' => null, 'mode' => 'allowlist'],
            ]];
    }

    private function configured(array $keys): bool
    {
        return collect($keys)->every(fn ($key) => is_string(config($key)) && trim(config($key)) !== '');
    }
}
