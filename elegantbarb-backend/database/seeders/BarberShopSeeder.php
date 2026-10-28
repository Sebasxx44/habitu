<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\License;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\User;
use App\Models\Appointment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BarberShopSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['name' => 'Básico', 'description' => 'Plan básico para barberías pequeñas', 'price' => 99000, 'duration_days' => 30, 'max_barbers' => 2, 'max_clients' => 100],
            ['name' => 'Profesional', 'description' => 'Plan profesional', 'price' => 199000, 'duration_days' => 30, 'max_barbers' => 5, 'max_clients' => 500],
            ['name' => 'Empresarial', 'description' => 'Plan empresarial', 'price' => 399000, 'duration_days' => 30, 'max_barbers' => 10, 'max_clients' => 2000],
        ];
        foreach ($plans as $plan) Plan::create($plan);

        $barberias = [
            ['name' => 'Elegant Cut Zona Rosa', 'address' => 'Carrera 11 #82-12, Bogotá', 'phone' => '3112345678', 'lat' => 4.6930, 'lng' => -74.0540],
            ['name' => 'Barbería Central', 'address' => 'Calle 72 #9-45, Bogotá', 'phone' => '3201234567', 'lat' => 4.7010, 'lng' => -74.0580],
            ['name' => 'Dapper Style', 'address' => 'Carrera 15 #93-20, Bogotá', 'phone' => '3102345678', 'lat' => 4.6880, 'lng' => -74.0480],
            ['name' => 'Classic Cuts', 'address' => 'Calle 53 #8-25, Bogotá', 'phone' => '3151234567', 'lat' => 4.7100, 'lng' => -74.0620],
            ['name' => 'Urban Barber Shop', 'address' => 'Carrera 7 #71-21, Bogotá', 'phone' => '3002345678', 'lat' => 4.7050, 'lng' => -74.0550],
        ];

        foreach ($barberias as $i => $data) {
            $license = License::create([
                'plan_id' => rand(1, 3),
                'status' => 'ACTIVA',
                'start_date' => now(),
                'end_date' => now()->addDays(30),
            ]);

            $shop = BarberShop::create(array_merge($data, ['license_id' => $license->id]));

            $barbers = ['Carlos Muñoz', 'Andrés López', 'JuliánRodríguez'];
            foreach ($barbers as $name) {
                Barber::create([
                    'barber_shop_id' => $shop->id,
                    'name' => $name,
                    'specialty' => 'Cortes clásicos',
                    'phone' => Str::random(10),
                    'email' => Str::slug($name) . '@elegantbarb.com',
                ]);
            }

            $clients = ['Juan Pérez', 'María García', 'Pedro Gómez', 'Luis Castro', 'Sofía Moreno'];
            foreach ($clients as $name) {
                Client::create([
                    'barber_shop_id' => $shop->id,
                    'name' => $name,
                    'phone' => Str::random(10),
                    'email' => Str::slug($name) . '@email.com',
                    'loyalty_points' => rand(0, 500),
                ]);
            }

            $services = [
                ['name' => 'Corte de cabello', 'price' => 25000, 'duration_minutes' => 30],
                ['name' => 'Arreglo de barba', 'price' => 15000, 'duration_minutes' => 20],
                ['name' => 'Corte + Barba', 'price' => 35000, 'duration_minutes' => 45],
            ];
            foreach ($services as $svc) {
                Service::create(array_merge($svc, [
                    'barber_shop_id' => $shop->id,
                    'description' => $svc['name'],
                ]));
            }
        }

        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@demo.com',
            'password' => Hash::make('password'),
            'role' => 'SUPERADMIN',
        ]);

        User::create([
            'name' => 'Admin Barbería 1',
            'email' => 'admin@barberia1.com',
            'password' => Hash::make('password'),
            'role' => 'ADMIN_BARBERIA',
            'barber_shop_id' => 1,
        ]);

        $this->command->info('Seeded 5 barberías con datos demo');
    }
}