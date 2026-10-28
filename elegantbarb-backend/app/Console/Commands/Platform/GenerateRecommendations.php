<?php

namespace App\Console\Commands\Platform;

use App\Modules\People\Models\Client;
use App\Modules\Platform\Services\RecommendationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class GenerateRecommendations extends Command
{
    protected $signature = 'platform:generate-recommendations';

    protected $description = 'Genera y cachea recomendaciones para todos los clientes activos';

    public function handle(): int
    {
        try {
            $clients = Client::whereNotNull('user_id')->get();

            if ($clients->isEmpty()) {
                $this->info('No hay clientes activos para generar recomendaciones.');
                return self::SUCCESS;
            }

            /** @var RecommendationService $service */
            $service = app(RecommendationService::class);
            $count = 0;

            foreach ($clients as $client) {
                try {
                    $response = $service->getForUser(
                        userId: $client->user_id,
                        lat: null,
                        lng: null,
                        limit: 10
                    );

                    if ($response->success) {
                        Cache::put(
                            "recommendations:user:{$client->user_id}",
                            $response->data,
                            now()->addHours(24)
                        );
                        $count++;
                    }
                } catch (\Throwable $e) {
                    $this->warn("Error generando recomendaciones para cliente {$client->id}: {$e->getMessage()}");
                }
            }

            $this->info("Recomendaciones generadas y cacheadas para {$count} clientes.");
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Error al generar recomendaciones: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
