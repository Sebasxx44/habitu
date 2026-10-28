<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

final class BookingUpdate extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public array $details) {}

    public function build(): self
    {
        return $this->subject($this->details['title'].' · '.config('app.name'))
            ->markdown('emails.booking_update', ['details' => $this->details,
                'bookingUrl' => rtrim(config('app.frontend_url', 'http://localhost:5173'), '/').$this->details['url']]);
    }
}
