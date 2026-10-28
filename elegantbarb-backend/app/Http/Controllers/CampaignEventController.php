<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CampaignLog;
use App\Services\CampaignDeliveryService;
use App\Modules\Realtime\Services\ResourceChangePublisher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

final class CampaignEventController extends Controller
{
    public function open(string $token): Response
    {
        $entry = $this->entry($token);
        $changed = $entry->newQuery()->whereKey($entry->id)->whereNull('opened_at')->update(['opened_at' => now()]);
        if ($changed) app(ResourceChangePublisher::class)->capture($entry->campaign);
        return response(base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), 200,
            ['Content-Type' => 'image/gif', 'Cache-Control' => 'private, no-store, max-age=0', 'Pragma' => 'no-cache']);
    }

    public function click(string $token, CampaignDeliveryService $delivery): RedirectResponse
    {
        $entry = $this->entry($token);
        $changed = $entry->newQuery()->whereKey($entry->id)->whereNull('clicked_at')->update(['clicked_at' => now()]);
        $entry->newQuery()->whereKey($entry->id)->whereNull('opened_at')->update(['opened_at' => now()]);
        if ($changed) app(ResourceChangePublisher::class)->capture($entry->campaign);
        $url = rtrim((string) config('app.frontend_url'), '/').$delivery->bookingPath($entry->campaign);
        return redirect()->away($url)->header('Cache-Control', 'private, no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function unsubscribe(Request $request, string $token): Response
    {
        $entry = $this->entry($token);
        if ($request->isMethod('post')) {
            DB::table('marketing.campaign_suppressions')->insertOrIgnore(['business_id' => $entry->campaign->business_id,
                'email' => mb_strtolower(trim($entry->recipient_email)), 'created_at' => now(), 'updated_at' => now()]);
            $body = '<h1>Preferencia guardada</h1><p>No recibirás más campañas de este negocio. Tus reservas permanecen activas.</p>';
        } else {
            $body = '<h1>Dejar de recibir campañas</h1><p>Dejarás de recibir correos comerciales de este negocio.</p>'
                .'<form method="post"><button type="submit">Confirmar cancelación</button></form>';
        }
        return response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>Preferencias de campañas</title><body><main>'.$body.'</main></body></html>', 200,
            ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'private, no-store', 'Referrer-Policy' => 'no-referrer',
                'Content-Security-Policy' => "default-src 'none'; form-action 'self'; frame-ancestors 'none'", 'X-Robots-Tag' => 'noindex, nofollow']);
    }

    private function entry(string $token): CampaignLog
    {
        return CampaignLog::where('tracking_token', $token)->whereIn('status', ['SENT', 'OPENED', 'CLICKED'])
            ->with(['campaign.promotion'])->firstOrFail();
    }
}
