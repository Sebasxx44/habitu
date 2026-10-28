<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $emails = [
            'superadmin' => 'superadmin@elegantbarb.com',
            'admin'      => 'admin@elegantbarb.com',
            'prof'       => 'professional@elegantbarb.com',
            'client'     => 'cliente@elegantbarb.com',
            'client2'    => 'maria@elegantbarb.com',
        ];

        foreach ($emails as $key => $email) {
            DB::table('public.users')->updateOrInsert(
                ['email' => $email],
                [
                    'name' => match ($key) {
                        'superadmin' => 'Super Admin',
                        'admin' => 'Admin Negocio',
                        'prof' => 'Carlos Mendoza',
                        'client' => 'Juan Pérez',
                        'client2' => 'María García',
                    },
                    'password' => Hash::make('password'),
                    'role' => match ($key) {
                        'superadmin' => 'SUPERADMIN',
                        'admin' => 'ADMIN_BARBERIA',
                        'prof' => 'PROFESSIONAL',
                        default => 'CLIENTE',
                    },
                'created_at' => $now,
                'updated_at' => $now,
                ]
            );
        }

        $ids = [];
        foreach ($emails as $key => $email) {
            $ids[$key] = DB::table('public.users')->where('email', $email)->value('id');
        }

        // ─── Crear perfiles en people.clients (antes de obtener IDs legacy) ────
        $firstBusiness = DB::table('business.businesses')->first();
        $businessId = $firstBusiness?->id;

        foreach (['client', 'client2'] as $key) {
            $userId = $ids[$key];
            $exists = DB::table('people.clients')->where('user_id', $userId)->first();
            if (! $exists) {
                DB::table('people.clients')->insert([
                    'user_id' => $userId,
                    'name' => match($key) {
                        'client'  => 'Juan Pérez',
                        'client2' => 'María García',
                    },
                    'email' => $emails[$key],
                    'phone' => $key === 'client' ? '3205551111' : '3205552222',
                    'birthdate' => $key === 'client' ? '1995-06-15' : '1992-03-20',
                    'loyalty_points' => $key === 'client' ? 250 : 120,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // ─── Crear profesional en people.professionals (antes de obtener IDs legacy)
        $profExists = DB::table('people.professionals')->where('user_id', $ids['prof'])->first();
        if (! $profExists && $businessId) {
            DB::table('people.professionals')->insert([
                'business_id' => $businessId,
                'user_id' => $ids['prof'],
                'name' => 'Carlos Mendoza',
                'specialty' => 'Degradados',
                'bio' => 'Especialista en degradados y barba con 10 años de experiencia.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // ─── Asignar IDs legacy para compatibilidad con dashboard v1 ───────────
        $profId = DB::table('people.professionals')->where('user_id', $ids['prof'])->value('id');
        $clientId = DB::table('people.clients')->where('user_id', $ids['client'])->value('id');
        $client2Id = DB::table('people.clients')->where('user_id', $ids['client2'])->value('id');

        if ($businessId) {
            DB::table('public.users')->where('id', $ids['admin'])->update(['barber_shop_id' => $businessId]);
        }
        if ($profId) {
            DB::table('public.users')->where('id', $ids['prof'])->update(['barber_id' => $profId]);
        }
        if ($clientId) {
            DB::table('public.users')->where('id', $ids['client'])->update(['cliente_id' => $clientId]);
        }
        if ($client2Id) {
            DB::table('public.users')->where('id', $ids['client2'])->update(['cliente_id' => $client2Id]);
        }

        $this->command->info('=== USUARIOS DEMO ===');
        $this->command->info('SUPERADMIN:  superadmin@elegantbarb.com / password');
        $this->command->info('ADMIN:       admin@elegantbarb.com / password');
        $this->command->info('PROFESSIONAL: professional@elegantbarb.com / password');
        $this->command->info('CLIENTE:     cliente@elegantbarb.com / password');
        $this->command->info('CLIENTE 2:   maria@elegantbarb.com / password');
        $this->command->info('=====================');
    }
}
