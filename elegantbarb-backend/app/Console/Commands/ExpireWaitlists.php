<?php

namespace App\Console\Commands;

use App\Modules\Booking\Services\WaitlistService;
use Illuminate\Console\Command;

class ExpireWaitlists extends Command
{
    protected $signature = 'waitlist:expire';
    protected $description = 'Expire old waitlist entries';

    public function handle(WaitlistService $service)
    {
        $count = $service->expireOld();
        $service->scanPending();
        $this->info("Expired {$count} waitlist entries.");
        return 0;
    }
}
