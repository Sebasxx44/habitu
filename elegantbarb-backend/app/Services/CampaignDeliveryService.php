<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Campaign;
use App\Models\CampaignLog;
use App\Modules\Accounts\Services\AccountPreferences;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Models\Notification;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

final class CampaignDeliveryService
{
    public function __construct(private CampaignHtmlService $html) {}

    public function integration(): array
    {
        $mailer = (string) config('mail.default');
        $transport = (string) config('mail.mailers.'.$mailer.'.transport', $mailer);
        $address = (string) config('mail.from.address');
        $configured = filter_var($address, FILTER_VALIDATE_EMAIL) !== false
            && ! str_ends_with($address, '@example.com') && ! in_array($transport, ['array', 'log', 'failover', 'roundrobin'], true);
        if ($transport === 'smtp') {
            $configured = $configured && filled(config('mail.mailers.'.$mailer.'.host'))
                && (filled(config('mail.mailers.'.$mailer.'.username')) || ! str_contains((string) config('mail.mailers.'.$mailer.'.host'), 'mailgun.org'));
        }
        return ['mailer' => $mailer, 'configured' => $configured, 'delivery_enabled' => $configured,
            'queue_connection' => (string) config('queue.default'), 'tracking_enabled' => true];
    }

    public function bookingPath(Campaign $campaign): string
    {
        if ($campaign->target_role !== 'CLIENTE') return '/';
        $params = ['book' => '1'];
        if ($campaign->promotion && (int) $campaign->promotion->business_id === (int) $campaign->business_id && $campaign->promotion->promo_code) {
            $params['promo_code'] = $campaign->promotion->promo_code;
        }
        return '/cliente/business/'.$campaign->business_id.'?'.http_build_query($params);
    }

    public function deliver(Campaign $campaign, CampaignLog $entry): void
    {
        if (! in_array($entry->status, ['QUEUED', 'FAILED'], true)) return;
        $recipient = $this->recipient($campaign, $entry);
        if (! $recipient || ! AccountPreferences::allows($recipient->user, 'email_notifications')
            || DB::table('marketing.campaign_suppressions')->where('business_id', $campaign->business_id)->where('email', mb_strtolower($entry->recipient_email))->exists()) {
            $entry->update(['status' => 'SKIPPED', 'error_message' => 'El destinatario ya no pertenece a la audiencia o desactivó el correo.']);
            return;
        }
        if (! filter_var($entry->recipient_email, FILTER_VALIDATE_EMAIL)) {
            $entry->update(['status' => 'SKIPPED', 'error_message' => 'Correo no válido.']);
            return;
        }
        if ($campaign->promotion_id) {
            $campaign->load('promotion');
            if (! $campaign->promotion || ! $campaign->promotion->isValid()
                || (int) $campaign->promotion->business_id !== (int) $campaign->business_id) {
                $entry->update(['status' => 'FAILED', 'error_message' => 'La promoción vinculada ya no está disponible.']);
                return;
            }
        }
        if (! $this->integration()['delivery_enabled']) {
            $entry->update(['status' => 'FAILED', 'error_message' => 'Configura un proveedor de correo real y un remitente válido para enviar.']);
            return;
        }
        $entry->update(['status' => 'SENDING', 'tracking_token' => $entry->tracking_token ?: (string) Str::uuid(),
            'recipient_id' => $recipient->id, 'recipient_user_id' => $recipient->user_id, 'error_message' => null]);
        $body = $this->messageBody($campaign, $entry);
        try {
            Mail::html($body, fn (Message $message) => $this->addressMessage($message, $campaign, $entry));
        } catch (\Throwable $exception) {
            $entry->update(['status' => 'UNCERTAIN', 'error_message' => 'El proveedor no confirmó el resultado. Verifica su registro antes de iniciar otro envío.']);
            Log::warning('Campaign delivery failed', ['campaign_id' => $campaign->id, 'delivery_id' => $entry->id]);
            return;
        }
        // A process interrupted after SMTP acceptance stays SENDING and is never retried blindly.
        $entry->update(['status' => 'SENT', 'sent_at' => now(), 'error_message' => null]);
        if ($recipient->user_id) DB::transaction(fn () => $this->notifyRecipient($campaign, $entry));
    }

    private function recipient(Campaign $campaign, CampaignLog $entry): Client|Professional|null
    {
        $query = $campaign->target_role === 'CLIENTE' ? Client::query() : Professional::query()->where('is_active', true);
        return $query->where('business_id', $campaign->business_id)->with('user:id,preferences')
            ->when($entry->recipient_id, fn ($query) => $query->whereKey($entry->recipient_id))
            ->whereRaw('LOWER(TRIM(email)) = ?', [mb_strtolower(trim($entry->recipient_email))])->first();
    }

    private function addressMessage(Message $message, Campaign $campaign, CampaignLog $entry): void
    {
        $message->to($entry->recipient_email, $entry->recipient_name)->subject($campaign->subject);
        $headers = $message->getSymfonyMessage()->getHeaders();
        $headers->addTextHeader('List-Unsubscribe', '<'.route('campaign-events.unsubscribe', ['token' => $entry->tracking_token]).'>');
        $headers->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
    }

    private function messageBody(Campaign $campaign, CampaignLog $entry): string
    {
        $body = $this->html->sanitize($campaign->body);
        if ($campaign->target_role === 'CLIENTE') {
            $code = $campaign->promotion?->promo_code;
            if ($code) $body .= '<p>Tu cupón: <strong>'.e($code).'</strong>. Sujeto a vigencia, servicios y condiciones de la promoción.</p>';
            $body .= '<p><a href="'.e(route('campaign-events.click', ['token' => $entry->tracking_token])).'">Ver beneficios y reservar</a></p>';
        }
        $body .= '<hr><p>Recibes este mensaje de '.e($campaign->barberShop?->name ?? 'tu negocio').'. '
            .'<a href="'.e(route('campaign-events.unsubscribe', ['token' => $entry->tracking_token])).'">Dejar de recibir campañas de este negocio</a></p>';
        return $body.'<img src="'.e(route('campaign-events.open', ['token' => $entry->tracking_token])).'" width="1" height="1" alt="">';
    }

    private function notifyRecipient(Campaign $campaign, CampaignLog $entry): void
    {
        $locked = CampaignLog::lockForUpdate()->findOrFail($entry->id);
        if ($locked->notification_sent_at || ! $locked->recipient_user_id) return;
        Notification::create(['user_id' => $locked->recipient_user_id, 'type' => 'PROMOTION', 'title' => $campaign->subject,
            'message' => Str::limit(trim(html_entity_decode(strip_tags($campaign->body))), 280),
            'data' => ['campaign_id' => $campaign->id, 'business_id' => $campaign->business_id, 'promotion_id' => $campaign->promotion_id,
                'url' => $this->bookingPath($campaign)], 'read' => false]);
        $locked->update(['notification_sent_at' => now()]);
    }
}
