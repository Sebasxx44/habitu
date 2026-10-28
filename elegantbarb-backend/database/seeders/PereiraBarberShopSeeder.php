<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\License;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\User;
use App\Models\Expense;
use App\Models\Appointment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PereiraBarberShopSeeder extends Seeder
{
    protected $pereiraCoords = [
        ['lat' => 4.8125, 'lng' => -75.6921],
        ['lat' => 4.8150, 'lng' => -75.6980],
        ['lat' => 4.8200, 'lng' => -75.6850],
        ['lat' => 4.8080, 'lng' => -75.6800],
        ['lat' => 4.8220, 'lng' => -75.6750],
        ['lat' => 4.8100, 'lng' => -75.7050],
        ['lat' => 4.8250, 'lng' => -75.6880],
        ['lat' => 4.8060, 'lng' => -75.6950],
        ['lat' => 4.8180, 'lng' => -75.7100],
        ['lat' => 4.8130, 'lng' => -75.6780],
    ];

    protected $barberias = [
        'El Rey del Corte',
        'Barbería Vintage Pereira',
        'Dapper Style Pereira',
        'Corte & Estilo',
        'The Gentlemen\'s Club',
        'Barbería Central Pereira',
        'Classic Cuts Pereira',
        'Urban Style Pereira',
        'La Casa del Barbero',
        'Estilo Masculino Pereira',
    ];

    protected $streets = [
        'Carrera 7 #18-35',
        'Calle 14 #7-42',
        'Carrera 10 #16-28',
        'Calle 18 #10-15',
        'Carrera 8 #22-50',
        'Calle 20 #8-30',
        'Carrera 12 #14-20',
        'Calle 16 #12-45',
        'Carrera 9 #25-18',
        'Calle 22 #6-35',
    ];

    public function run(): void
    {
        $plans = [
            ['name' => 'Básico', 'description' => 'Plan básico', 'price' => 99000, 'duration_days' => 30, 'max_barbers' => 2, 'max_clients' => 100],
            ['name' => 'Profesional', 'description' => 'Plan profesional', 'price' => 199000, 'duration_days' => 30, 'max_barbers' => 5, 'max_clients' => 500],
            ['name' => 'Empresarial', 'description' => 'Plan empresarial', 'price' => 399000, 'duration_days' => 30, 'max_barbers' => 10, 'max_clients' => 2000],
        ];
        foreach ($plans as $plan) Plan::create($plan);

        $superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@demo.com',
            'password' => \Illuminate\Support\Facades\Hash::make('password'),
            'role' => 'SUPERADMIN',
        ]);

        for ($i = 0; $i < 10; $i++) {
            $shop = $this->createBarberShop($i);
            $this->createBarbers($shop->id, $i);
            $this->createClients($shop->id, $i);
            $this->createServices($shop->id);
            $this->createAppointments($shop->id, $i);
            $this->createExpenses($shop->id);
            
            User::create([
                'name' => 'Admin ' . ($i + 1),
                'email' => 'admin@barberia' . ($i + 1) . '.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
                'role' => 'ADMIN_BARBERIA',
                'barber_shop_id' => $shop->id,
            ]);
        }

        $this->command->info('Seeded 10 barberías en Pereira con datos de ingresos');
    }

    protected function createBarberShop(int $index): BarberShop
    {
        $license = License::create([
            'plan_id' => rand(1, 3),
            'status' => 'ACTIVA',
            'start_date' => Carbon::now()->subDays(rand(30, 180)),
            'end_date' => Carbon::now()->addDays(rand(30, 180)),
        ]);

        $coords = $this->pereiraCoords[$index];

        return BarberShop::create([
            'name' => $this->barberias[$index],
            'address' => $this->streets[$index] . ', Pereira, Risaralda',
            'phone' => '6' . rand(3000000, 3999999),
            'lat' => $coords['lat'] + (rand(-100, 100) / 100000),
            'lng' => $coords['lng'] + (rand(-100, 100) / 100000),
            'active' => true,
            'license_id' => $license->id,
        ]);
    }

    protected function createBarbers(int $shopId, int $index): void
    {
        $names = [
            ['Carlos Muñoz', 'Cortes clásicos'],
            ['Andrés López', 'Fade y taper'],
            ['Juan Rodríguez', 'Arreglo de barba'],
        ];
        
        foreach ($names as [$name, $specialty]) {
            Barber::create([
                'barber_shop_id' => $shopId,
                'name' => $name . ' ' . ($index + 1),
                'specialty' => $specialty,
                'phone' => '3' . rand(300000000, 399999999),
                'email' => Str::slug($name) . ($index + 1) . '@elegantbarb.com',
            ]);
        }
    }

    protected function createClients(int $shopId, int $index): void
    {
        $names = ['Juan Pérez', 'Pedro Gómez', 'Luis Castro', 'Mario Rivera', 'Alberto Sáenz'];
        
        foreach ($names as $name) {
            Client::create([
                'barber_shop_id' => $shopId,
                'name' => $name . ' ' . ($index + 1),
                'phone' => '3' . rand(100000000, 399999999),
                'email' => Str::slug($name) . ($index + 1) . rand(10, 99) . '@email.com',
                'loyalty_points' => rand(0, 500),
            ]);
        }
    }

    protected function createServices(int $shopId): void
    {
        $services = [
            ['Corte de cabello', 25000, 30],
            ['Arreglo de barba', 15000, 20],
            ['Corte + Barba', 35000, 45],
            ['Afeitado clásico', 12000, 15],
            ['Tratamiento capilar', 30000, 40],
        ];
        
        foreach ($services as [$name, $price, $duration]) {
            Service::create([
                'barber_shop_id' => $shopId,
                'name' => $name,
                'description' => $name,
                'price' => $price,
                'duration_minutes' => $duration,
                'active' => true,
            ]);
        }
    }

    protected function createAppointments(int $shopId, int $index): void
    {
        $barbers = Barber::where('barber_shop_id', $shopId)->get();
        $clients = Client::where('barber_shop_id', $shopId)->get();
        $services = Service::where('barber_shop_id', $shopId)->get();
        
        $daysToGenerate = rand(15, 30);
        $baseDate = Carbon::now()->subDays($daysToGenerate);
        
        for ($d = 0; $d < $daysToGenerate; $d++) {
            $date = $baseDate->copy()->addDays($d);
            
            if ($date->dayOfWeek === Carbon::SUNDAY) continue;
            
            $appointmentsPerDay = rand(3, 12);
            
            for ($a = 0; $a < $appointmentsPerDay; $a++) {
                $barber = $barbers->random();
                $client = $clients->random();
                $service = $services->random();
                $hour = rand(8, 18);
                $minute = rand(0, 3) * 15;
                
                $status = rand(1, 100) <= 85 ? 'COMPLETADA' : (rand(1, 100) <= 50 ? 'CANCELADA' : 'PENDIENTE');
                $paid = $status === 'COMPLETADA' ? rand(1, 100) <= 90 : false;
                
                Appointment::create([
                    'barber_shop_id' => $shopId,
                    'barber_id' => $barber->id,
                    'client_id' => $client->id,
                    'service_id' => $service->id,
                    'date' => $date,
                    'time' => sprintf('%02d:%02d:00', $hour, $minute),
                    'status' => $status,
                    'price' => $service->price,
                    'paid' => $paid,
                ]);
            }
        }
    }

    protected function createExpenses(int $shopId): void
    {
        $categories = ['SERVICIOS', 'PRODUCTOS', 'NOMINA', 'ARRIENDO', 'SERVICIOS_PUBLICOS', 'MARKETING', 'OTROS'];
        
        for ($i = 0; $i < rand(5, 15); $i++) {
            Expense::create([
                'barber_shop_id' => $shopId,
                'description' => 'Gasto operativo #' . ($i + 1),
                'amount' => rand(50000, 500000),
                'category' => $categories[array_rand($categories)],
                'date' => Carbon::now()->subDays(rand(0, 30)),
            ]);
        }
    }
}