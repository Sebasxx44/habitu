<?php

declare(strict_types=1);

namespace App\Modules\Accounts\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Accounts\Services\AccountPreferences;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Services\TwoFactorAuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

final class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($this->present($request->user()))->header('Cache-Control', 'private, no-store');
    }

    public function update(Request $request)
    {
        $data = $request->validate(['name' => 'required|string|max:100', 'phone' => ['nullable', 'string', 'max:30', 'regex:/^\\+?[0-9 ()-]{6,30}$/'], 'role' => 'prohibited', 'email' => 'prohibited']);
        $data['name'] = trim($data['name']);
        if ($data['name'] === '') throw ValidationException::withMessages(['name' => 'Escribe tu nombre.']);
        $user = DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $user->forceFill($data)->save();
            Client::where('user_id', $user->id)->update($data);
            Professional::where('user_id', $user->id)->update($data);
            return $user;
        });
        return response()->json($this->present($user));
    }

    public function preferences(Request $request)
    {
        $data = $request->validate(['language' => 'required|in:es,en', 'theme' => 'required|in:light,dark,system', 'appointment_reminders' => 'required|boolean', 'email_notifications' => 'required|boolean']);
        $user = $request->user();
        $user->forceFill(['preferences' => $data])->save();
        return response()->json($this->present($user));
    }

    public function avatar(Request $request)
    {
        $data = $request->validate(['avatar' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048|dimensions:min_width=32,min_height=32,max_width=2048,max_height=2048']);
        $user = $request->user();
        $path = $data['avatar']->store('avatars/'.$user->id, 'public');
        try {
            $old = DB::transaction(function () use ($user, $path) {
                $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                $old = $locked->avatar_path;
                $locked->forceFill(['avatar_path' => $path])->save();
                return $old;
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
        if ($old && str_starts_with($old, 'avatars/'.$user->id.'/')) Storage::disk('public')->delete($old);
        return response()->json($this->present($user->fresh()));
    }

    public function deleteAvatar(Request $request)
    {
        $user = $request->user();
        $old = DB::transaction(function () use ($user) {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $old = $locked->avatar_path;
            $locked->forceFill(['avatar_path' => null])->save();
            return $old;
        });
        if ($old && str_starts_with($old, 'avatars/'.$user->id.'/')) Storage::disk('public')->delete($old);
        return response()->json($this->present($user->fresh()));
    }

    public function password(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|string|max:255', 'password' => ['required', 'confirmed', 'max:128', Password::min(12)->letters()->numbers()], 'two_factor_code' => 'nullable|string|max:16']);
        DB::transaction(function () use ($request, $data) {
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $this->reauthenticate($user, $data);
            $user->forceFill(['password' => Hash::make($data['password']), 'remember_token' => null])->save();
            $this->revokeOtherSessions($request, $user);
        });
        return response()->json(['updated' => true]);
    }

    public function email(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|string|max:255', 'email' => 'required|email:rfc|max:255', 'two_factor_code' => 'nullable|string|max:16']);
        $data['email'] = mb_strtolower(trim($data['email']));
        $user = DB::transaction(function () use ($request, $data) {
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['account-email:'.$data['email']]);
            $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $this->reauthenticate($user, $data);
            if ($user->google_id) throw ValidationException::withMessages(['email' => 'El correo de una cuenta vinculada a Google se administra con ese proveedor.']);
            if (User::whereRaw('LOWER(email) = ?', [$data['email']])->whereKeyNot($user->id)->exists()) throw ValidationException::withMessages(['email' => 'Este correo ya está registrado.']);
            $user->forceFill(['email' => $data['email'], 'remember_token' => null])->save();
            Client::where('user_id', $user->id)->update(['email' => $data['email']]);
            Professional::where('user_id', $user->id)->update(['email' => $data['email']]);
            $this->revokeOtherSessions($request, $user);
            return $user;
        });
        return response()->json($this->present($user));
    }

    private function reauthenticate(User $user, array $data): void
    {
        if (! Hash::check($data['current_password'], $user->password)) throw ValidationException::withMessages(['current_password' => 'La contraseña actual no es correcta.']);
        $twoFactor = app(TwoFactorAuthService::class);
        if ($twoFactor->isEnabled($user) && (empty($data['two_factor_code']) || (! $twoFactor->verify($user, $data['two_factor_code']) && ! $twoFactor->verifyRecoveryCode($user, $data['two_factor_code'])))) throw ValidationException::withMessages(['two_factor_code' => 'Ingresa un código de autenticación válido.']);
    }

    private function revokeOtherSessions(Request $request, User $user): void
    {
        $token = $request->user()->currentAccessToken();
        $user->tokens()->when($token instanceof PersonalAccessToken, fn ($query) => $query->where('id', '<>', $token->id))->delete();
    }

    private function present(User $user): array
    {
        return ['user' => $user->only(['id', 'name', 'email', 'role', 'phone', 'avatar_url', 'created_at']), 'preferences' => AccountPreferences::forUser($user),
            'security' => ['google_linked' => (bool) $user->google_id, 'two_factor_enabled' => app(TwoFactorAuthService::class)->isEnabled($user)],
            'capabilities' => ['email_delivery' => (bool) config('booking.email_enabled')]];
    }
}
