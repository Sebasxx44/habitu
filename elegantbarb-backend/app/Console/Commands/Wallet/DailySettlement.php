<?php

namespace App\Console\Commands\Wallet;

use App\Core\Enums\WalletTransactionType;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Models\WalletTransaction;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DailySettlement extends Command
{
    protected $signature = 'wallet:daily-settlement';

    protected $description = 'Liquida diariamente las ganancias de profesionales por servicios on-demand completados';

    public function handle(): int
    {
        try {
            $requests = OnDemandRequest::where('status', 'COMPLETED')
                ->where('completed_at', '>=', now()->subHours(24))
                ->whereNotNull('professional_id')
                ->whereNotNull('final_price')
                ->get();

            if ($requests->isEmpty()) {
                $this->info('No hay servicios completados en las últimas 24 horas para liquidar.');
                return self::SUCCESS;
            }

            $totalSettled = 0;
            foreach ($requests as $request) {
                $professional = Professional::find($request->professional_id);
                if (! $professional?->user_id) {
                    continue;
                }
                $wallet = app(\App\Modules\Finance\Repositories\WalletRepository::class)->getOrCreate((int) $professional->user_id);
                $minor = \App\Core\Support\Money::minor((string) $request->final_price);
                $netMinor = intdiv($minor * 85 + 50, 100);
                if ($netMinor <= 0) {
                    continue;
                }
                $transaction = $wallet->payout(\App\Core\Support\Money::decimal($netMinor), [
                    'description' => 'Liquidación por servicio on-demand',
                    'source_type' => OnDemandRequest::class, 'source_id' => $request->id,
                    'external_reference' => 'ON_DEMAND_SETTLEMENT:' . $request->id,
                ]);
                if ($transaction->wasRecentlyCreated) {
                    $totalSettled += $netMinor;
                }
            }

            $this->info('Liquidación completada. Total liquidado: ' . number_format($totalSettled / 100, 2));
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error en la liquidación diaria: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
