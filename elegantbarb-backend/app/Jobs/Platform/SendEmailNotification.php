<?php

namespace App\Jobs\Platform;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendEmailNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public string $mailableClass,
        public string $toEmail,
        public array $data = []
    ) {}

    public function handle(): void
    {
        if (! class_exists($this->mailableClass)) {
            return;
        }

        $mailable = new $this->mailableClass($this->data);
        Mail::to($this->toEmail)->send($mailable);
    }
}
