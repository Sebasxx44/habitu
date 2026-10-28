<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\LoyaltyProgram;
use App\Models\LoyaltyCard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TayanaRealisticSeeder extends Seeder
{
    public function run(): void
    {
        // Find the user's shop (Lima Style Barber)
        $shop = BarberShop::where('name', 'LIKE', '%Lima%')->first();
        if (!$shop) {
            $shop = BarberShop::first();
        }

        if (!$shop) return;

        $this->command->info("Poblando datos realistas para: {$shop->name}");

        // 1. Clean existing data for this shop to avoid duplicates or mess
        // Appointment::where('barber_shop_id', $shop->id)->delete();
        // Barber::where('barber_shop_id', $shop->id)->delete();
        // Client::where('barber_shop_id', $shop->id)->delete();

        // 2. Realistic Barbers
        $barbersData = [
            ['name' => 'Sebastian Sanchez', 'specialty' => 'Master Barber & Fade Expert', 'commission' => 40],
            ['name' => 'Camilo "The Barber"', 'specialty' => 'Classic Cuts & Shave', 'commission' => 35],
            ['name' => 'Andrés Rodríguez', 'specialty' => 'Stylist & Colorist', 'commission' => 30],
            ['name' => 'Mateo Gomez', 'specialty' => 'Beard specialist', 'commission' => 35],
        ];

        $barbers = [];
        foreach ($barbersData as $data) {
            $barbers[] = Barber::updateOrCreate(
                ['email' => Str::slug($data['name']) . '@elegantbarb.com'],
                [
                    'barber_shop_id' => $shop->id,
                    'name' => $data['name'],
                    'specialty' => $data['specialty'],
                    'phone' => '31' . rand(10000000, 99999999),
                    'commission_percentage' => $data['commission'],
                    'active' => true,
                    'photo_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . urlencode($data['name'])
                ]
            );
        }

        // 3. Realistic Services
        $servicesData = [
            ['name' => 'Corte Premium', 'price' => 35000, 'duration' => 45],
            ['name' => 'Perfilado de Barba', 'price' => 18000, 'duration' => 20],
            ['name' => 'Combo Elegant (Corte + Barba)', 'price' => 48000, 'duration' => 60],
            ['name' => 'Limpieza Facial Express', 'price' => 25000, 'duration' => 30],
        ];

        $services = [];
        foreach ($servicesData as $data) {
            $services[] = Service::updateOrCreate(
                ['name' => $data['name'], 'barber_shop_id' => $shop->id],
                [
                    'price' => $data['price'],
                    'duration_minutes' => $data['duration'],
                    'description' => 'Servicio profesional de alta calidad con productos premium.',
                    'active' => true,
                ]
            );
        }

        // 4. Realistic Clients
        $clientsData = [
            'Santiago Herrera', 'Nicolas Castro', 'Felipe Mendez', 'Juan Jose Ospina', 
            'David Rivera', 'Samuel Torres', 'Alejandro Vargas', 'Daniel Rojas',
            'Cristian Ruiz', 'Bryan Lopez'
        ];

        $clients = [];
        foreach ($clientsData as $name) {
            $clients[] = Client::updateOrCreate(
                ['email' => Str::slug($name) . '@gmail.com'],
                [
                    'barber_shop_id' => $shop->id,
                    'name' => $name,
                    'phone' => '300' . rand(1000000, 9999999),
                    'loyalty_points' => rand(0, 1000),
                ]
            );
        }

        // 5. Realistic Appointments (History)
        foreach ($clients as $client) {
            // Each client has 3-8 past appointments
            for ($i = 0; $i < rand(3, 8); $i++) {
                $barber = $barbers[array_rand($barbers)];
                $service = $services[array_rand($services)];
                
                Appointment::create([
                    'barber_shop_id' => $shop->id,
                    'barber_id' => $barber->id,
                    'client_id' => $client->id,
                    'service_id' => $service->id,
                    'date' => now()->subDays(rand(1, 60))->format('Y-m-d'),
                    'time' => rand(9, 19) . ':00',
                    'status' => 'COMPLETADA',
                    'price' => $service->price,
                    'paid' => true,
                ]);
            }
        }

        // 6. Loyalty Program & Cards
        $program = LoyaltyProgram::updateOrCreate(
            ['name' => 'Corte Premium Gratis', 'barber_shop_id' => $shop->id],
            [
                'description' => 'Acumula 5 cortes y el 6to es totalmente gratis.',
                'reward_description' => 'Corte de Cabello Gratis',
                'stamps_required' => 5,
                'active' => true,
                'type' => 'STAMP'
            ]
        );

        foreach ($clients as $index => $client) {
            $stamps = rand(0, 5);
            $client->update([
                'tier' => ['Bronce', 'Plata', 'Oro'][rand(0, 2)],
                'xp_points' => rand(100, 1000)
            ]);
            
            // Assign 1-2 random favorite barbers
            $favBarbers = collect($barbers)->random(rand(1, 2))->pluck('id');
            $client->favoriteBarbers()->sync($favBarbers);

            LoyaltyCard::updateOrCreate(
                ['loyalty_program_id' => $program->id, 'client_id' => $client->id],
                [
                    'barber_shop_id' => $shop->id,
                    'current_stamps' => $stamps,
                    'total_stamps_ever' => rand($stamps, 15),
                    'reward_available' => $stamps >= 5,
                    'status' => 'ACTIVE'
                ]
            );
        }

        $this->command->info("Datos realistas generados con éxito para {$shop->name}");
    }
}
