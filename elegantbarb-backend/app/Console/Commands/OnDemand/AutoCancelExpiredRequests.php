<?php

namespace App\Console\Commands\OnDemand;

use App\Core\Enums\OnDemandStatus;
use App\Modules\OnDemand\Models\OnDemandRequest;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AutoCancelExpiredRequests extends Command
{
    protected $signature = 'ondemand:auto-cancel';

    protected $description = 'Cancela solicitudes on-demand cuyo tiempo de búsqueda ha expirado';

    public function handle(): int
    {
        try {
            $expiredRequests = OnDemandRequest::where('status', OnDemandStatus::SEARCHING->value)
                ->where('search_expires_at', '<', now())
                ->get();

            if ($expiredRequests->isEmpty()) {
                $this->info('No hay solicitudes expiradas para cancelar.');
                return self::SUCCESS;
            }

            $count = 0;

            DB::transaction(function () use ($expiredRequests, &$count) {
                foreach ($expiredRequests as $request) {
                    $previousStatus = $request->status;

                    $request->update([
                        'status' => OnDemandStatus::CANCELLED->value,
                        'cancellation_reason' => 'Tiempo de búsqueda expirado',
                        'cancelled_at' => now(),
                    ]);

                    $request->assignments()
                        ->whereIn('status', ['PENDING', 'OFFERED', 'SEARCHING'])
                        ->update(['status' => 'CANCELLED']);

                    $request->statusHistory()->create([
                        'from_status' => $previousStatus,
                        'to_status' => OnDemandStatus::CANCELLED->value,
                        'changed_by' => null,
                        'notes' => 'Cancelación automática por expiración de tiempo de búsqueda',
                    ]);

                    $count++;
                }
            });

            $this->info("{$count} solicitudes canceladas por expiración.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error al cancelar solicitudes expiradas: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
