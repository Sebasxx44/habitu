<?php

namespace App\Jobs\Wallet;

use App\Modules\Finance\Models\Wallet;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessPayout implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private string $reference;

    public int $tries = 3;
    public int $backoff = 300; // 5 minutes

    public function __construct(
        public int $professionalUserId,
        public float $amount,
        public string $description,
        public ?int $sourceId = null,
        public ?string $sourceType = null
    ) {
        $this->reference = $sourceId !== null && $sourceType !== null
            ? 'PAYOUT:' . $sourceType . ':' . $sourceId
            : 'PAYOUT:' . \Illuminate\Support\Str::uuid();
    }

    public function handle(NotificationService $notifications): void
    {
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $this->professionalUserId],
            ['balance' => 0, 'currency' => 'COP']
        );

        $wallet->payout($this->amount, [
            'external_reference' => $this->reference,
            'description' => $this->description,
            'source_type' => $this->sourceType,
            'source_id' => $this->sourceId,
        ]);

        $notifications->sendToUser(
            $this->professionalUserId,
            'WALLET_PAYOUT',
            'Pago recibido',
            "Se acreditó \$" . number_format($this->amount, 0) . " COP a tu wallet. {$this->description}",
            ['amount' => $this->amount, 'balance' => $wallet->fresh()->balance]
        );
    }
}
