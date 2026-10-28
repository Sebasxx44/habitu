<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorAuthService
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    public function generateSecret(User $user): array
    {
        if ($this->isEnabled($user)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['code' => 'Desactiva la verificación actual antes de configurarla de nuevo.']);
        }
        $secret = $this->google2fa->generateSecretKey();
        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        $recoveryCodes = collect(range(1, 8))->map(fn () => bin2hex(random_bytes(4)))->toArray();

        DB::table('auth.two_factor_auths')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'secret' => Crypt::encryptString($secret),
                'recovery_codes' => json_encode(array_map(fn (string $code) => Hash::make($code), $recoveryCodes)),
                'enabled' => false,
                'updated_at' => now(),
            ]
        );

        return [
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
            'recovery_codes' => $recoveryCodes,
        ];
    }

    public function enable(User $user, string $code): bool
    {
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->first();
        if (! $record) return false;

        $valid = $this->google2fa->verifyKey($this->readSecret($record->secret), $code);
        if (! $valid) return false;

        DB::table('auth.two_factor_auths')
            ->where('user_id', $user->id)
            ->update([
                'enabled' => true,
                'enabled_at' => now(),
                'updated_at' => now(),
            ]);

        return true;
    }

    public function verify(User $user, string $code): bool
    {
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->first();
        if (! $record || ! $record->enabled) return false;

        return $this->google2fa->verifyKey($this->readSecret($record->secret), $code);
    }

    public function disable(User $user, string $code): bool
    {
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->first();
        if (! $record || ! $record->enabled) return false;

        $valid = $this->google2fa->verifyKey($this->readSecret($record->secret), $code);
        if (! $valid) return false;

        DB::table('auth.two_factor_auths')
            ->where('user_id', $user->id)
            ->update([
                'enabled' => false,
                'enabled_at' => null,
                'updated_at' => now(),
            ]);

        return true;
    }

    public function verifyRecoveryCode(User $user, string $code): bool
    {
        return DB::transaction(fn () => $this->consumeRecoveryCode($user, $code));
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->lockForUpdate()->first();
        if (! $record || ! $record->enabled) return false;
        $codes = json_decode($record->recovery_codes, true) ?? [];
        foreach ($codes as $key => $stored) {
            $valid = str_starts_with($stored, '$2') ? Hash::check($code, $stored) : hash_equals($stored, $code);
            if (! $valid) continue;
            unset($codes[$key]);
            DB::table('auth.two_factor_auths')->where('user_id', $user->id)->update([
                'recovery_codes' => json_encode(array_values($codes)), 'updated_at' => now(),
            ]);
            return true;
        }
        return false;
    }

    private function readSecret(string $secret): string
    {
        // Existing plain base32 secrets remain usable until users rotate 2FA.
        return preg_match('/^[A-Z2-7]+$/', $secret) ? $secret : Crypt::decryptString($secret);
    }

    public function isEnabled(User $user): bool
    {
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->first();
        return $record?->enabled ?? false;
    }
}
