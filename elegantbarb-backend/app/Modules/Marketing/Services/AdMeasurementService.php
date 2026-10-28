<?php

declare(strict_types=1);

namespace App\Modules\Marketing\Services;

use App\Modules\Booking\Models\Appointment;
use App\Modules\Marketing\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AdMeasurementService
{
    public function delivery(Ad $ad, ?int $userId): array
    {
        $token = (string) Str::uuid();
        DB::transaction(function () use ($token, $ad, $userId) {
            $measuredUser = $this->consents($userId) ? $userId : null;
            DB::table('marketing.ad_deliveries')->insert(['id' => $token, 'ad_id' => $ad->id, 'user_id' => $measuredUser,
                'expires_at' => now()->addMinutes(15), 'created_at' => now(), 'updated_at' => now()]);
        });
        return ['id' => $ad->id, 'title' => $ad->title, 'description' => $ad->description, 'image_url' => $ad->image_url,
            'link_url' => '/b/'.$ad->business->slug, 'placement' => $ad->placement, 'sponsored' => true, 'delivery_token' => $token];
    }

    public function record(int $adId, string $token, string $event, ?int $userId = null): void
    {
        DB::transaction(function () use ($adId, $token, $event, $userId) {
            $consents = $this->consents($userId);
            $delivery = DB::table('marketing.ad_deliveries')->where('id', $token)->where('ad_id', $adId)->lockForUpdate()->first();
            abort_unless($delivery, 404);
            abort_unless($delivery->user_id === null || (int) $delivery->user_id === $userId, 403);
            $measuredUser = $consents ? $delivery->user_id : null;
            $ad = Ad::whereKey($adId)->lockForUpdate()->firstOrFail();
            $column = $event === 'click' ? 'clicked_at' : 'viewed_at';
            if ($delivery->$column) return;
            abort_unless(now()->lt($delivery->expires_at) && $ad->status === 'ACTIVE' && $ad->moderation_status === 'APPROVED'
                && $ad->start_date->toDateString() <= now(config('booking.timezone'))->toDateString()
                && $ad->end_date->toDateString() >= now(config('booking.timezone'))->toDateString(), 422, 'La entrega del anuncio venció o fue desactivada.');
            if ($event === 'click') {
                abort_unless($delivery->viewed_at, 422, 'Primero debe registrarse una visualización del anuncio.');
                abort_if($ad->click_limit !== null && $ad->clicks_count >= $ad->click_limit, 422, 'Este anuncio alcanzó su límite de clics.');
                $ad->recordClick($measuredUser, $ad->placement);
            } else {
                abort_if($ad->impression_limit !== null && $ad->impressions_count >= $ad->impression_limit, 422, 'Este anuncio alcanzó su límite de impresiones.');
                $ad->recordImpression($measuredUser, $ad->placement);
            }
            DB::table('marketing.ad_deliveries')->where('id', $token)->update([$column => now(), 'user_id' => $measuredUser, 'updated_at' => now()]);
        });
    }

    public function attribute(Appointment $appointment): void
    {
        $userId = $appointment->client?->user_id;
        if (! $this->consents($userId)) return;
        $delivery = DB::table('marketing.ad_deliveries as d')->join('marketing.ads as a', 'a.id', '=', 'd.ad_id')
            ->where('d.user_id', $userId)->where('a.business_id', $appointment->business_id)
            ->where('d.clicked_at', '>=', now()->subDays(7))->where('d.clicked_at', '<=', now())->orderByDesc('d.clicked_at')->first(['d.id', 'd.ad_id']);
        if (! $delivery) return;
        DB::table('marketing.ad_attributions')->insertOrIgnore(['ad_id' => $delivery->ad_id, 'delivery_id' => $delivery->id,
            'appointment_id' => $appointment->id, 'created_at' => now()]);
    }

    public function forget(int $userId): void
    {
        DB::table('marketing.ad_attributions')->whereIn('delivery_id', DB::table('marketing.ad_deliveries')->where('user_id', $userId)->select('id'))->delete();
        foreach (['marketing.ad_deliveries', 'marketing.ad_impressions', 'marketing.ad_clicks'] as $table) DB::table($table)->where('user_id', $userId)->update(['user_id' => null]);
    }

    private function consents(?int $userId): bool
    {
        if ($userId === null || ! config('analytics.enabled')) return false;
        $preference = DB::table('platform.analytics_preferences')->where('user_id', $userId)->lockForUpdate()->first();
        return (bool) $preference?->measurement;
    }
}
