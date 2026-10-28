<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesPermissionsSeeder;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class BootstrapSuperadmin extends Command
{
    protected $signature = 'app:bootstrap-superadmin {--if-configured : Omitir si no hay correo configurado}';
    protected $description = 'Crear el superadministrador inicial usando secretos del entorno sin reemplazar cuentas existentes';

    public function handle(): int
    {
        $email = config('auth.bootstrap_superadmin.email');
        if ((! is_string($email) || trim($email) === '') && $this->option('if-configured')) {
            return self::SUCCESS;
        }

        $settings = Validator::make([
            'email' => is_string($email) ? strtolower(trim($email)) : $email,
            'name' => config('auth.bootstrap_superadmin.name'),
        ], ['email' => 'required|email|max:255', 'name' => 'required|string|max:100']);

        if ($settings->fails()) {
            $this->error('Configura SUPERADMIN_EMAIL y SUPERADMIN_NAME válidos en los secretos del servicio.');
            return self::FAILURE;
        }

        $data = $settings->validated();
        try {
            $created = DB::transaction(fn () => $this->createAdministrator($data['email'], $data['name']));
        } catch (ValidationException $exception) {
            foreach ($exception->errors() as $messages) {
                $this->error(implode(' ', $messages));
            }
            return self::FAILURE;
        } catch (QueryException) {
            $this->error('No se pudo crear el administrador. Verifica la conexión, las migraciones y los accesos de la base de datos.');
            return self::FAILURE;
        }

        $this->info($created
            ? 'Superadministrador creado. La contraseña permanece únicamente en los secretos del servicio.'
            : 'El superadministrador ya existe; sus credenciales y sesiones se conservaron.');
        return self::SUCCESS;
    }

    private function createAdministrator(string $email, string $name): bool
    {
        $existing = User::whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
        if ($existing) {
            if ($existing->role !== User::ROLE_SUPERADMIN) {
                throw ValidationException::withMessages(['email' => 'El correo configurado pertenece a otra cuenta. No se elevaron sus privilegios.']);
            }
            $this->initializePermissions();
            return false;
        }

        $password = Validator::make(['password' => config('auth.bootstrap_superadmin.password')], [
            'password' => ['required', 'string', 'max:255', Password::min(16)->mixedCase()->numbers()->symbols()],
        ]);
        if ($password->fails()) {
            throw ValidationException::withMessages(['password' => 'SUPERADMIN_PASSWORD debe tener al menos 16 caracteres con mayúsculas, minúsculas, números y símbolos.']);
        }

        $this->initializePermissions();
        User::create([
            'email' => $email,
            'name' => $name,
            'password' => Hash::make($password->validated()['password']),
            'role' => User::ROLE_SUPERADMIN,
        ]);
        return true;
    }

    private function initializePermissions(): void
    {
        // Seed only an empty installation; preserve permission customizations on repeated deploys.
        if (! Role::exists() && ! Permission::exists()) {
            $this->callSilent('db:seed', ['--class' => RolesPermissionsSeeder::class, '--force' => true]);
        }
    }
}
