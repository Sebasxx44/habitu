<?php

namespace App\Modules\Platform\Services;

use App\Modules\People\Models\Professional;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleCalendarBusyService
{
    private const API = 'https://www.googleapis.com/calendar/v3';

    public function __construct(private GoogleCalendarService $calendar) {}

    public function status(int $professionalId): array
    {
        $record = DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->first();
        return ['configured' => $this->calendar->configured(), 'connected' => $this->calendar->isConnected($professionalId),
            'professional_id' => $professionalId, 'last_synced_at' => $record?->last_synced_at,
            'sync_error' => $record?->sync_error, 'channel_expires_at' => $record?->channel_expires_at,
            'busy_count' => DB::table('platform.google_calendar_busy')->where('professional_id', $professionalId)->where('ends_at', '>', now())->count()];
    }

    public function sync(int $professionalId): array
    {
        return Cache::lock('calendar.busy.'.$professionalId, 120)->block(2, function () use ($professionalId) {
            $accessToken = $this->calendar->getAccessToken($professionalId);
            abort_unless($accessToken, 422, 'Vuelve a conectar Google Calendar.');
            $record = DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->first();
            $full = ! $record->sync_token || ! $record->last_full_sync_at || CarbonImmutable::parse($record->last_full_sync_at)->lt(now()->subDays(7));
            $result = $this->fetch($professionalId, $accessToken, $full ? null : $record->sync_token);
            if ($result['expired']) { $full = true; $result = $this->fetch($professionalId, $accessToken, null); }
            if ($result['failed']) {
                DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->update(['sync_error' => 'SYNC_FAILED']);
                abort(502, 'No se pudo importar disponibilidad. La última sincronización se conserva.');
            }
            $timezone = $result['timezone'] ?? Professional::findOrFail($professionalId)->business?->timezone ?? config('booking.timezone', 'America/Bogota');
            $ownIds = DB::table('platform.google_calendar_events')->where('professional_id', $professionalId)->pluck('google_event_id')->all();
            $events = $result['events'];
            DB::transaction(function () use ($professionalId, $events, $full, $result, $timezone, $ownIds) {
                // Same lock used by appointment and on-demand allocation; imported conflicts never move reservations.
                Professional::whereKey($professionalId)->lockForUpdate()->first();
                abort_unless(DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->lockForUpdate()->first(), 409, 'La conexión cambió durante la sincronización.');
                if ($full) DB::table('platform.google_calendar_busy')->where('professional_id', $professionalId)->delete();
                foreach ($events as $event) {
                    if (empty($event['id'])) continue;
                    $query = DB::table('platform.google_calendar_busy')->where('professional_id', $professionalId)->where('google_event_id', $event['id']);
                    if (($event['status'] ?? '') === 'cancelled' || ($event['transparency'] ?? '') === 'transparent' || in_array($event['id'], $ownIds, true)) { $query->delete(); continue; }
                    $start = $event['start']['dateTime'] ?? $event['start']['date'] ?? null;
                    $end = $event['end']['dateTime'] ?? $event['end']['date'] ?? null;
                    if (! $start || ! $end) continue;
                    $from = CarbonImmutable::parse($start, $event['start']['timeZone'] ?? $timezone)->utc();
                    $to = CarbonImmutable::parse($end, $event['end']['timeZone'] ?? $timezone)->utc();
                    if ($to->lte(now()) || $to->lte($from)) { $query->delete(); continue; }
                    $query->updateOrInsert(['professional_id' => $professionalId, 'google_event_id' => $event['id']], [
                        'starts_at' => $from, 'ends_at' => $to, 'is_all_day' => isset($event['start']['date']), 'created_at' => now(), 'updated_at' => now(),
                    ]);
                }
                DB::table('platform.google_calendar_busy')->where('professional_id', $professionalId)->where('ends_at', '<=', now())->delete();
                DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->update([
                    'sync_token' => $result['next_sync_token'], 'last_synced_at' => now(), 'sync_error' => null,
                ] + ($full ? ['last_full_sync_at' => now()] : []));
            });
            try { $this->renewChannel($professionalId, $accessToken); } catch (\Throwable $exception) { report($exception); }
            return $this->status($professionalId);
        });
    }

    private function fetch(int $professionalId, string $accessToken, ?string $syncToken): array
    {
        $params = ['singleEvents' => 'true', 'maxResults' => 2500, 'showDeleted' => 'true'];
        if ($syncToken) $params['syncToken'] = $syncToken;
        else { $params['timeMin'] = now()->subDay()->toIso8601String(); $params['timeMax'] = now()->addMonths(6)->toIso8601String(); }
        $events = [];
        do {
            try { $response = Http::timeout(20)->withToken($accessToken)->get(self::API.'/calendars/primary/events', $params); }
            catch (\Throwable $exception) { report($exception); return ['expired' => false, 'failed' => true, 'events' => [], 'next_sync_token' => null]; }
            if ($response->status() === 410) return ['expired' => true, 'failed' => false, 'events' => [], 'next_sync_token' => null];
            if (! $response->successful()) return ['expired' => false, 'failed' => true, 'events' => [], 'next_sync_token' => null];
            $events = array_merge($events, $response->json('items', []));
            $params['pageToken'] = $response->json('nextPageToken');
        } while ($params['pageToken']);
        return ['expired' => false, 'failed' => false, 'events' => $events, 'next_sync_token' => $response->json('nextSyncToken'), 'timezone' => $response->json('timeZone')];
    }

    public function renewChannel(int $professionalId, string $accessToken): void
    {
        $callback = rtrim((string) config('app.url'), '/').'/api/v2/webhooks/google-calendar';
        if (! str_starts_with($callback, 'https://')) return;
        $record = DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->first();
        if ($record->channel_expires_at && CarbonImmutable::parse($record->channel_expires_at)->gt(now()->addDay())) return;
        $channel = (string) Str::uuid();
        $secret = bin2hex(random_bytes(32));
        $response = Http::timeout(10)->withToken($accessToken)->post(self::API.'/calendars/primary/events/watch', [
            'id' => $channel, 'type' => 'web_hook', 'address' => $callback, 'token' => $secret,
            'expiration' => (string) now()->addDays(6)->getTimestampMs(),
        ]);
        if (! $response->successful()) return;
        DB::table('platform.google_calendar_tokens')->where('professional_id', $professionalId)->update([
            'channel_id' => $channel, 'channel_token_hash' => hash('sha256', $secret), 'channel_resource_id' => $response->json('resourceId'),
            'channel_expires_at' => CarbonImmutable::createFromTimestampMs((int) $response->json('expiration')), 'channel_message_number' => 0,
        ]);
        if ($record->channel_id && $record->channel_resource_id) $this->stopChannel($accessToken, $record->channel_id, $record->channel_resource_id);
    }

    public function stopChannel(string $accessToken, string $channelId, string $resourceId): void
    {
        Http::timeout(10)->withToken($accessToken)->post(self::API.'/channels/stop', ['id' => $channelId, 'resourceId' => $resourceId]);
    }

    public function acceptWebhook(string $channelId, string $secret, string $resourceId, string $number): ?int
    {
        if (! ctype_digit($number) || strlen($number) > 18) return null;
        return DB::transaction(function () use ($channelId, $secret, $resourceId, $number) {
            $query = DB::table('platform.google_calendar_tokens')->where('channel_id', $channelId);
            $record = $query->lockForUpdate()->first();
            if (! $record || ! $record->channel_token_hash || ! hash_equals($record->channel_token_hash, hash('sha256', $secret))
                || $record->channel_resource_id !== $resourceId || ! $record->channel_expires_at
                || CarbonImmutable::parse($record->channel_expires_at)->isPast() || (int) $number <= $record->channel_message_number) return null;
            $query->update(['channel_message_number' => (int) $number]);
            return (int) $record->professional_id;
        });
    }

    public function refreshConnected(): void
    {
        if (! $this->calendar->configured()) return;
        foreach (DB::table('platform.google_calendar_tokens')->pluck('professional_id') as $professionalId) {
            \App\Jobs\SyncGoogleCalendarBusy::dispatch((int) $professionalId);
        }
    }
}
