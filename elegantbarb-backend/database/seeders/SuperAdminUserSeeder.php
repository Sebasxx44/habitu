<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class SuperAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Production administrators must use secret configuration, never demo passwords.
        if (Artisan::call('app:bootstrap-superadmin') !== 0) {
            throw new \RuntimeException('No se pudo crear el superadministrador. Configura los secretos SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD.');
        }
    }
}
