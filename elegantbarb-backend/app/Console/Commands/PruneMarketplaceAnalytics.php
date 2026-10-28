<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class PruneMarketplaceAnalytics extends Command
{
    protected $signature = 'analytics:prune';
    protected $description = 'Remove expired optional marketplace measurement events';

    public function handle(): int
    {
        $removed = DB::table('platform.marketplace_events')->where('created_at', '<', now()->subDays((int) config('analytics.retention_days', 400)))->delete();
        $this->info("Removed {$removed} expired measurement events.");
        return self::SUCCESS;
    }
}
