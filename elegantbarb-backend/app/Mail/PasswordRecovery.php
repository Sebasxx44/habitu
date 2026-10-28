<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

final class PasswordRecovery extends Mailable
{
    public function __construct(private string $token, private string $email) {}

    public function build(): self
    {
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $this->token, 'email' => $this->email]);
        return $this->subject('Restablece tu contraseña de habitu')->view('mail.password-recovery', ['resetUrl' => $url, 'minutes' => config('auth.passwords.users.expire')]);
    }
}
