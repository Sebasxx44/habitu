<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\License;
use App\Models\Plan;
use App\Models\City;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Creating demo data for all roles...');

        $password = Hash::make('password');
        
        // Get first shop for admin/barbero/cliente
        $shop = BarberShop::first();
        $city = City::first();

        // ==================== ADMIN BARBERIA ====================
        $admin = User::updateOrCreate(
            ['email' => 'admin1'],
            [
                'name' => 'Admin Barbería',
                'email' => 'admin1',
                'password' => $password,
                'role' => 'ADMIN_BARBERIA',
                'barber_shop_id' => $shop->id,
            ]
        );
        $adminRole = \App\Models\Role::where('slug', 'admin')->first();
        if ($adminRole) {
            $admin->roles()->sync([$adminRole->id]);
        }
        $this->command->info("Admin: admin1 / password ({$shop->name})");

        // ==================== BARBEROS ====================
        $barberoNames = ['Carlos Mendoza', 'Andrés Silva', 'Jorge Ruiz'];
        $barberoEmails = ['barbero1', 'barbero2', 'barbero3'];
        $barberoUsers = [];
        
        for ($i = 0; $i < 3; $i++) {
            $user = User::updateOrCreate(
                ['email' => $barberoEmails[$i]],
                [
                    'name' => $barberoNames[$i],
                    'email' => $barberoEmails[$i],
                    'password' => $password,
                    'role' => 'PROFESSIONAL',
                    'barber_shop_id' => $shop->id,
                ]
            );
            $barber = Barber::updateOrCreate(
                ['barber_shop_id' => $shop->id, 'email' => $barberoEmails[$i]],
                [
                    'barber_shop_id' => $shop->id,
                    'name' => $barberoNames[$i],
                    'email' => $barberoEmails[$i],
                    'phone' => '310' . rand(1000000, 9999999),
                    'specialty' => $i === 0 ? 'Cortes clásicos' : ($i === 1 ? 'Afitado y barba' : 'Cortes modernos'),
                ]
            );
            $barberoUsers[] = $barber;
            $user->barber_id = $barber->id;
            $user->save();
            
            $barberRole = \App\Models\Role::where('slug', 'barber')->first();
            if ($barberRole) {
                $user->roles()->sync([$barberRole->id]);
            }
        }
        $this->command->info("Created 3 barberos");

        // ==================== CLIENTES ====================
        $clientNames = ['Juan Pérez', 'María García', 'Pedro López', 'Ana Martínez', 'Sofia Hernández'];
        $clientEmails = ['cliente1', 'cliente2', 'cliente3', 'cliente4', 'cliente5'];
        $clients = [];
        
        for ($i = 0; $i < 5; $i++) {
            $user = User::updateOrCreate(
                ['email' => $clientEmails[$i]],
                [
                    'name' => $clientNames[$i],
                    'email' => $clientEmails[$i],
                    'password' => $password,
                    'role' => 'CLIENTE',
                    'barber_shop_id' => $shop->id,
                ]
            );
            $client = Client::updateOrCreate(
                ['barber_shop_id' => $shop->id, 'email' => $clientEmails[$i]],
                [
                    'barber_shop_id' => $shop->id,
                    'name' => $clientNames[$i],
                    'email' => $clientEmails[$i],
                    'phone' => '310' . rand(1000000, 9999999),
                    'loyalty_points' => rand(0, 150),
                ]
            );
            $clients[] = $client;
            $user->cliente_id = $client->id;
            $user->save();
            
            $clientRole = \App\Models\Role::where('slug', 'client')->first();
            if ($clientRole) {
                $user->roles()->sync([$clientRole->id]);
            }
        }
        $this->command->info("Created 5 clientes");

        // ==================== SERVICIOS ====================
        $services = Service::updateOrCreate(
            ['barber_shop_id' => $shop->id, 'name' => 'Corte clásico'],
            ['barber_shop_id' => $shop->id, 'name' => 'Corte clásico', 'price' => 25000, 'duration_minutes' => 30, 'description' => 'Corte tradicional']
        );
        Service::updateOrCreate(
            ['barber_shop_id' => $shop->id, 'name' => 'Corte premium'],
            ['barber_shop_id' => $shop->id, 'name' => 'Corte premium', 'price' => 35000, 'duration_minutes' => 45, 'description' => 'Corte con diseño']
        );
        Service::updateOrCreate(
            ['barber_shop_id' => $shop->id, 'name' => 'Barba recortada'],
            ['barber_shop_id' => $shop->id, 'name' => 'Barba recortada', 'price' => 15000, 'duration_minutes' => 20, 'description' => 'Arreglo de barba']
        );
        Service::updateOrCreate(
            ['barber_shop_id' => $shop->id, 'name' => 'Corte + Barba'],
            ['barber_shop_id' => $shop->id, 'name' => 'Corte + Barba', 'price' => 35000, 'duration_minutes' => 50, 'description' => 'Paquete completo']
        );
        $shopServices = Service::where('barber_shop_id', $shop->id)->get();
        $this->command->info("Created {$shopServices->count()} servicios");

        // ==================== CITAS ====================
        $today = now();
        $times = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
        
        // Citas hoy
        for ($i = 0; $i < 6; $i++) {
            $status = $i < 2 ? 'PENDIENTE' : ($i < 4 ? 'CONFIRMADA' : 'COMPLETADA');
            Appointment::create([
                'barber_shop_id' => $shop->id,
                'client_id' => $clients[$i % count($clients)]->id,
                'barber_id' => $barberoUsers[$i % count($barberoUsers)]->id,
                'service_id' => $shopServices[$i % $shopServices->count()]->id,
                'date' => $today->copy()->format('Y-m-d'),
                'time' => $times[$i],
                'status' => $status,
                'price' => $shopServices[$i % $shopServices->count()]->price,
                'paid' => $status === 'COMPLETADA',
            ]);
        }
        
        // Citas mañana
        $tomorrow = $today->copy()->addDay();
        for ($i = 0; $i < 4; $i++) {
            Appointment::create([
                'barber_shop_id' => $shop->id,
                'client_id' => $clients[($i + 2) % count($clients)]->id,
                'barber_id' => $barberoUsers[($i + 1) % count($barberoUsers)]->id,
                'service_id' => $shopServices[($i + 1) % $shopServices->count()]->id,
                'date' => $tomorrow->format('Y-m-d'),
                'time' => $times[$i],
                'status' => 'PENDIENTE',
                'price' => $shopServices[($i + 1) % $shopServices->count()]->price,
                'paid' => false,
            ]);
        }
        
        // Citas históricas (30 días)
        for ($d = 1; $d <= 30; $d++) {
            $date = $today->copy()->subDays($d);
            $numAppts = rand(2, 5);
            for ($i = 0; $i < $numAppts; $i++) {
                $randClient = $clients[array_rand($clients)];
                $randBarber = $barberoUsers[array_rand($barberoUsers)];
                $randService = $shopServices->random();
                Appointment::create([
                    'barber_shop_id' => $shop->id,
                    'client_id' => $randClient->id,
                    'barber_id' => $randBarber->id,
                    'service_id' => $randService->id,
                    'date' => $date->format('Y-m-d'),
                    'time' => (9 + $i * 2) . ':00',
                    'status' => 'COMPLETADA',
                    'price' => $randService->price,
                    'paid' => true,
                ]);
            }
        }
        $this->command->info('Created appointments (today, tomorrow, historical)');

        // ==================== Citas explícitas para cliente1 ====================
        $cliente1User = User::where('email', 'cliente1@elegantbarb.com')->first();
        if ($cliente1User && $cliente1User->cliente_id) {
            $c1Id = $cliente1User->cliente_id;
            $randBarber = $barberoUsers[0];
            $randService = $shopServices[0];
            
            // 2 próximas
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $randBarber->id, 'service_id' => $randService->id, 'date' => $today->copy()->addDays(2)->format('Y-m-d'), 'time' => '10:00', 'status' => 'PENDIENTE', 'price' => $randService->price, 'paid' => false]);
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $barberoUsers[1]->id, 'service_id' => $shopServices[1]->id, 'date' => $today->copy()->addDays(4)->format('Y-m-d'), 'time' => '15:30', 'status' => 'CONFIRMADA', 'price' => $shopServices[1]->price, 'paid' => false]);
            
            // 3 completadas
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $randBarber->id, 'service_id' => $randService->id, 'date' => $today->copy()->subDays(5)->format('Y-m-d'), 'time' => '11:00', 'status' => 'COMPLETADA', 'price' => $randService->price, 'paid' => true]);
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $barberoUsers[1]->id, 'service_id' => $shopServices[1]->id, 'date' => $today->copy()->subDays(12)->format('Y-m-d'), 'time' => '09:00', 'status' => 'COMPLETADA', 'price' => $shopServices[1]->price, 'paid' => true]);
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $barberoUsers[0]->id, 'service_id' => $shopServices[2]->id, 'date' => $today->copy()->subDays(20)->format('Y-m-d'), 'time' => '16:00', 'status' => 'COMPLETADA', 'price' => $shopServices[2]->price, 'paid' => true]);
            
            // 2 canceladas
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $randBarber->id, 'service_id' => $randService->id, 'date' => $today->copy()->subDays(2)->format('Y-m-d'), 'time' => '14:00', 'status' => 'CANCELADA', 'price' => $randService->price, 'paid' => false]);
            Appointment::create(['barber_shop_id' => $shop->id, 'client_id' => $c1Id, 'barber_id' => $barberoUsers[1]->id, 'service_id' => $shopServices[1]->id, 'date' => $today->copy()->addDays(1)->format('Y-m-d'), 'time' => '10:00', 'status' => 'CANCELADA', 'price' => $shopServices[1]->price, 'paid' => false]);
            
            $this->command->info('Created explicit appointments for cliente1');
        }

        $this->command->info('========================================');
        $this->command->info('DEMO DATA COMPLETADO');
        $this->command->info('========================================');
        $this->command->info('SUPERADMIN:  superadmin@demo.com / password');
        $this->command->info('ADMIN:      admin@elegantbarb.com / password');
        $this->command->info('PROFESSIONAL: barbero1 / password');
        $this->command->info('CLIENTE:    cliente1@elegantbarb.com / password');
        $this->command->info('========================================');
    }
}
