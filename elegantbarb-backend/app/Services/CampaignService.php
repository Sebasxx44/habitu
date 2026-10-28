<?php

namespace App\Services;

use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignLog;
use App\Repositories\Interfaces\CampaignRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class CampaignService
{
    public function __construct(private CampaignRepositoryInterface $campaignRepository, private CampaignHtmlService $html,
        private CampaignAudienceService $audience) {}

    public function createCampaign(array $data): Campaign
    {
        $data['body'] = $this->html->sanitize($data['body']);
        abort_unless(trim(strip_tags($data['body'])) !== '', 422, 'Escribe contenido válido para el correo.');
        return $this->campaignRepository->create($data);
    }

    public function recipientsQuery(int $businessId, string $targetRole, ?array $targetIds = null, array $segment = []): Builder
    {
        return $this->audience->query($businessId, $targetRole, $targetIds, $segment)->whereNotNull('email');
    }

    public function getRecipients(int $shopId, string $targetRole, ?array $targetIds = null): Collection
    {
        return $this->audience->recipients($shopId, $targetRole, $targetIds);
    }

    public function updateCampaign(Campaign $campaign, array $data): Campaign
    {
        return DB::transaction(fn () => $this->saveDraft($campaign->id, $data));
    }

    private function saveDraft(int $campaignId, array $data): Campaign
    {
        $campaign = Campaign::lockForUpdate()->findOrFail($campaignId);
        abort_unless($campaign->status === 'DRAFT', 409, 'Solo puedes editar borradores. Duplica la campaña para modificar un envío.');
        if (isset($data['body'])) $data['body'] = $this->html->sanitize($data['body']);
        if (isset($data['body'])) abort_unless(trim(strip_tags($data['body'])) !== '', 422, 'Escribe contenido válido para el correo.');
        $campaign->update($data);
        return $campaign->load('promotion');
    }

    public function deleteCampaign(int $campaignId): void
    {
        DB::transaction(fn () => $this->deleteDraft($campaignId));
    }

    private function deleteDraft(int $campaignId): void
    {
        $campaign = Campaign::lockForUpdate()->findOrFail($campaignId);
        abort_unless($campaign->status === 'DRAFT' && ! $campaign->logs()->exists(), 409,
            'Solo puedes eliminar borradores sin envíos. El historial de entrega se conserva.');
        $campaign->delete();
    }

    public function queueCampaign(int $campaignId): bool
    {
        return DB::transaction(fn () => $this->reserveCampaign($campaignId));
    }

    private function reserveCampaign(int $campaignId): bool
    {
        $campaign = Campaign::lockForUpdate()->find($campaignId);
        if (! $campaign || ! in_array($campaign->status, ['DRAFT', 'FAILED'], true)) return false;
        if ($campaign->promotion_id) abort_unless($campaign->promotion && $campaign->promotion->isValid()
            && (int) $campaign->promotion->business_id === (int) $campaign->business_id, 422,
            'La promoción vinculada está inactiva, vencida o agotada. Revisa sus condiciones antes de enviar.');
        if (! $campaign->logs()->exists()) {
            $recipients = $this->audience->recipients($campaign->business_id, $campaign->target_role ?? 'CLIENTE', $campaign->target_ids, $campaign->segment ?? []);
            if ($recipients->isEmpty()) return false;
            foreach ($recipients as $recipient) {
                CampaignLog::create(['campaign_id' => $campaign->id, 'recipient_id' => $recipient->id,
                    'recipient_user_id' => $recipient->user_id, 'recipient_email' => mb_strtolower(trim($recipient->email)),
                    'recipient_name' => $recipient->name, 'status' => 'QUEUED', 'tracking_token' => (string) Str::uuid()]);
            }
        }
        if (! $campaign->logs()->whereIn('status', ['QUEUED', 'FAILED'])->exists()) return false;
        $campaign->update(['recipients_count' => $campaign->logs()->count(), 'status' => 'PENDING']);
        ProcessCampaignJob::dispatch($campaignId)->afterCommit();
        return true;
    }
}
