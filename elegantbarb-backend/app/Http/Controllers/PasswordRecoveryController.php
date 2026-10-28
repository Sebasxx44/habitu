<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class PasswordRecoveryController extends Controller
{
    public function request(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:255']);
        $data['email'] = $this->canonicalEmail($data['email']);
        // Recovery links must never be written to a log transport.
        abort_if(in_array(config('mail.default'), ['log', 'array', 'failover', 'roundrobin'], true) && ! app()->environment('testing'), 503, 'La recuperación por correo no está disponible. Contacta con soporte.');
        try {
            Password::sendResetLink($data, fn (User $user, string $token) => Mail::to($user->email)->send(new \App\Mail\PasswordRecovery($token, $user->email)));
        } catch (\Throwable) {
            // Do not log mail transport exceptions: they can contain credentials or the reset URL.
            return response()->json(['message' => 'No pudimos procesar la recuperación. Inténtalo más tarde.'], 503);
        }
        return response()->json(['message' => 'Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:255', 'token' => 'required|string|max:255', 'password' => 'required|string|min:8|max:255|confirmed']);
        $data['email'] = $this->canonicalEmail($data['email']);
        $status = DB::transaction(fn () => $this->resetLocked($data));
        if ($status !== Password::PASSWORD_RESET) throw ValidationException::withMessages(['token' => 'El enlace no es válido o expiró. Solicita uno nuevo.']);
        return response()->json(['message' => 'Contraseña actualizada. Inicia sesión nuevamente.']);
    }

    private function canonicalEmail(string $email): string
    {
        $normalized = strtolower(trim($email));
        return User::whereRaw('LOWER(email) = ?', [$normalized])->value('email') ?? $normalized;
    }

    private function resetLocked(array $data): string
    {
        // Serializes token consumption so two concurrent requests cannot reuse it.
        DB::table(config('auth.passwords.users.table'))->where('email', $data['email'])->lockForUpdate()->first();
        return Password::reset($data, fn (User $user, string $password) => $this->replacePassword($user, $password));
    }

    private function replacePassword(User $user, string $password): void
    {
        $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
        $user->tokens()->delete();
        event(new PasswordReset($user));
    }
}
