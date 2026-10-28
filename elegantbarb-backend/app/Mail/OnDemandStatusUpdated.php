<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OnDemandStatusUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public array $data;

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    public function build()
    {
        return $this->subject('Actualización de tu solicitud - ' . ($this->data['request_code'] ?? ''))
                    ->view('emails.ondemand_status')
                    ->with($this->data);
    }
}
