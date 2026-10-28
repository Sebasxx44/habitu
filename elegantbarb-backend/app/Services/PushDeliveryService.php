<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** ACCEPTED records an FCM acknowledgement, never device display or user reading. */
final class PushDeliveryService
{
    public function attempt(object $device, string $eventId, callable $send): bool
    {
        $claim = DB::transaction(function () use ($device, $eventId) {
            $current = DB::table('platform.push_devices')->where('id', $device->id)->where('user_id', $device->user_id)->whereNull('revoked_at')->lockForUpdate()->first();
            if (! $current) return ['skip' => true];
            DB::table('platform.push_deliveries')->insertOrIgnore(['device_id' => $device->id, 'user_id' => $device->user_id,
                'event_id' => $eventId, 'state' => 'PENDING', 'attempts' => 0, 'created_at' => now(), 'updated_at' => now()]);
            $delivery = DB::table('platform.push_deliveries')->where('device_id', $device->id)->where('event_id', $eventId)->lockForUpdate()->first();
            if (in_array($delivery->state, ['ACCEPTED', 'REVOKED', 'FAILED'], true)) return ['skip' => true];
            if ($delivery->state === 'SENDING' && $delivery->locked_at && CarbonImmutable::parse($delivery->locked_at)->gt(now()->subMinutes(2))) return ['skip' => false];
            if ($delivery->attempts >= 3) {
                DB::table('platform.push_deliveries')->where('id', $delivery->id)->update(['state' => 'FAILED', 'locked_at' => null, 'updated_at' => now()]);
                return ['skip' => true];
            }
            $attempt = $delivery->attempts + 1;
            DB::table('platform.push_deliveries')->where('id', $delivery->id)->update(['state' => 'SENDING', 'attempts' => $attempt, 'locked_at' => now(), 'updated_at' => now()]);
            return ['id' => $delivery->id, 'attempt' => $attempt];
        });
        if (array_key_exists('skip', $claim)) return $claim['skip'];
        try { $result = $send(); }
        catch (\Throwable $exception) {
            Log::warning('Push device attempt failed', ['exception' => $exception::class]);
            $result = ['accepted' => false, 'permanent' => false, 'message_id' => null];
        }
        $state = $result['accepted'] ? 'ACCEPTED' : ($result['permanent'] ? 'REVOKED' : ($claim['attempt'] >= 3 ? 'FAILED' : 'RETRY_PENDING'));
        DB::table('platform.push_deliveries')->where('id', $claim['id'])->where('attempts', $claim['attempt'])->update([
            'state' => $state, 'locked_at' => null, 'accepted_at' => $result['accepted'] ? now() : null,
            'provider_message_id' => $result['message_id'], 'updated_at' => now(),
        ]);
        return $result['accepted'] || $result['permanent'];
    }
}
