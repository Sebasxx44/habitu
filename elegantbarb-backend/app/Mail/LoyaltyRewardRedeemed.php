<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\LoyaltyCard;

class LoyaltyRewardRedeemed extends Mailable
{
    use Queueable, SerializesModels;

    public $card;

    public function __construct(LoyaltyCard $card)
    {
        $this->card = $card;
    }

    public function build()
    {
        return $this->subject('¡Felicidades! Has redimido tu premio en ElegantBarb')
                    ->html("
                        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;'>
                            <h2 style='color: #10b981;'>¡Hola, {$this->card->client->name}!</h2>
                            <p>¡Felicidades! Has redimido con éxito tu premio: <strong>{$this->card->program->reward_description}</strong>.</p>
                            <p>Gracias por tu fidelidad en nuestra barbería. Esperamos verte pronto para seguir sumando experiencias.</p>
                            <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;'>
                            <p style='font-size: 12px; color: #666;'>Este es un mensaje automático de ElegantBarb. Por favor, no respondas a este correo.</p>
                        </div>
                    ");
    }
}
