<?php

namespace App\Jobs;

use App\Modules\Platform\Services\GoogleCalendarBusyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncGoogleCalendarBusy implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $uniqueFor = 120;
    public array $backoff = [30, 120, 300];

    public function __construct(public int $professionalId) {}

    public function uniqueId(): string { return (string) $this->professionalId; }

    public function handle(GoogleCalendarBusyService $service): void { $service->sync($this->professionalId); }
}
