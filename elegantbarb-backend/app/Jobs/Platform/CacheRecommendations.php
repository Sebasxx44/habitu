<?php

namespace App\Jobs\Platform;

use App\Modules\Platform\Services\RecommendationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CacheRecommendations implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $userId) {}

    public function handle(RecommendationService $service): void
    {
        $client = DB::table('people.clients')->where('user_id', $this->userId)->first();
        
        $response = $service->getForUser(
            $this->userId,
            $client?->lat,
            $client?->lng,
            10
        );

        if ($response->success && $response->data) {
            Cache::put(
                "recommendations.user.{$this->userId}",
                $response->data,
                now()->addHours(24)
            );
        }
    }
}
