<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\CampaignLog;
use App\Services\CampaignDeliveryService;
use App\Modules\Realtime\Services\ResourceChangePublisher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(protected int $campaignId) {}

    public function handle(CampaignDeliveryService $delivery): void
    {
        $claimed = Campaign::whereKey($this->campaignId)->where('status', 'PENDING')->update(['status' => 'PROCESSING']);
        if (! $claimed) return;
        $campaign = Campaign::with(['promotion', 'barberShop'])->findOrFail($this->campaignId);
        app(ResourceChangePublisher::class)->capture($campaign);
        $campaign->logs()->whereIn('status', ['QUEUED', 'FAILED'])
            ->chunkById(100, fn (Collection $logs) => $this->sendBatch($logs, $campaign, $delivery));
        $sent = $campaign->logs()->whereIn('status', ['SENT', 'OPENED', 'CLICKED'])->distinct('recipient_email')->count('recipient_email');
        $incomplete = $campaign->logs()->whereIn('status', ['FAILED', 'SENDING', 'UNCERTAIN', 'QUEUED'])->exists();
        $campaign->update(['status' => $incomplete ? 'FAILED' : 'COMPLETED', 'sent_count' => $sent, 'sent_at' => now()]);
    }

    public function failed(\Throwable $exception): void
    {
        $campaign = Campaign::whereKey($this->campaignId)->where('status', 'PROCESSING')->first();
        $campaign?->update(['status' => 'FAILED']);
    }

    private function sendBatch(Collection $logs, Campaign $campaign, CampaignDeliveryService $delivery): void
    {
        $logs->each(fn (CampaignLog $entry) => $delivery->deliver($campaign, $entry));
        app(ResourceChangePublisher::class)->capture($campaign);
    }
}
