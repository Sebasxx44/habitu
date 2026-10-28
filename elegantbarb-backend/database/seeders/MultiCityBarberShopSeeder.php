<?php

namespace Database\Seeders;

use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\License;
use App\Models\Plan;
use App\Models\Country;
use App\Models\City;
use Illuminate\Database\Seeder;

class MultiCityBarberShopSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Starting multi-city seeder...');

        $countries = [
            ['name' => 'Colombia', 'code' => 'CO', 'currency' => 'COP', 'timezone' => 'America/Bogota'],
            ['name' => 'México', 'code' => 'MX', 'currency' => 'MXN', 'timezone' => 'America/Mexico_City'],
            ['name' => 'Estados Unidos', 'code' => 'US', 'currency' => 'USD', 'timezone' => 'America/New_York'],
            ['name' => 'España', 'code' => 'ES', 'currency' => 'EUR', 'timezone' => 'Europe/Madrid'],
            ['name' => 'Perú', 'code' => 'PE', 'currency' => 'PEN', 'timezone' => 'America/Lima'],
        ];

        foreach ($countries as $country) {
            Country::create($country);
        }

        $cities = [
            ['name' => 'Pereira', 'country_id' => 1, 'lat' => 4.8133, 'lng' => -75.6901],
            ['name' => 'Bogotá', 'country_id' => 1, 'lat' => 4.7110, 'lng' => -74.0721],
            ['name' => 'Medellín', 'country_id' => 1, 'lat' => 6.2476, 'lng' => -75.5658],
            ['name' => 'Cali', 'country_id' => 1, 'lat' => 3.4516, 'lng' => -76.5320],
            ['name' => 'Cartagena', 'country_id' => 1, 'lat' => 10.3910, 'lng' => -75.4834],
            ['name' => 'Ciudad de México', 'country_id' => 2, 'lat' => 19.4326, 'lng' => -99.1332],
            ['name' => 'Guadalajara', 'country_id' => 2, 'lat' => 20.6597, 'lng' => -103.3496],
            ['name' => 'Monterrey', 'country_id' => 2, 'lat' => 25.6866, 'lng' => -100.3161],
            ['name' => 'Nueva York', 'country_id' => 3, 'lat' => 40.7128, 'lng' => -74.0060],
            ['name' => 'Los Ángeles', 'country_id' => 3, 'lat' => 34.0522, 'lng' => -118.2437],
            ['name' => 'Miami', 'country_id' => 3, 'lat' => 25.7617, 'lng' => -80.1918],
            ['name' => 'Madrid', 'country_id' => 4, 'lat' => 40.4168, 'lng' => -3.7038],
            ['name' => 'Barcelona', 'country_id' => 4, 'lat' => 41.3851, 'lng' => 2.1734],
            ['name' => 'Lima', 'country_id' => 5, 'lat' => -12.0464, 'lng' => -77.0428],
        ];

        foreach ($cities as $city) {
            City::create($city);
        }

        $barberShops = [
            ['name' => 'El Rey del Corte', 'address' => 'Carrera 7 #18-35, Pereira', 'phone' => '63357599', 'lat' => 4.8124, 'lng' => -75.6923, 'city_id' => 1],
            ['name' => 'Barbería Vintage Pereira', 'address' => 'Carrera 9 #12-26, Pereira', 'phone' => '63357600', 'lat' => 4.8139, 'lng' => -75.6912, 'city_id' => 1],
            ['name' => 'Style Cut Pereira', 'address' => 'Calle 14 #8-42, Pereira', 'phone' => '63357601', 'lat' => 4.8142, 'lng' => -75.6905, 'city_id' => 1],
            ['name' => 'Royal Barber Shop', 'address' => 'Carrera 5 #16-28, Pereira', 'phone' => '63357602', 'lat' => 4.8115, 'lng' => -75.6931, 'city_id' => 1],
            ['name' => 'Barbería Tradicional', 'address' => 'Calle 20 #7-15, Pereira', 'phone' => '63357603', 'lat' => 4.8150, 'lng' => -75.6890, 'city_id' => 1],
            ['name' => 'Elite Cuts Pereira', 'address' => 'Carrera 10 #22-18, Pereira', 'phone' => '63357604', 'lat' => 4.8160, 'lng' => -75.6880, 'city_id' => 1],
            ['name' => 'Modern Barber Pereira', 'address' => 'Calle 8 #11-33, Pereira', 'phone' => '63357605', 'lat' => 4.8135, 'lng' => -75.6908, 'city_id' => 1],
            ['name' => 'Classic Cut Pereira', 'address' => 'Carrera 6 #20-40, Pereira', 'phone' => '63357606', 'lat' => 4.8155, 'lng' => -75.6915, 'city_id' => 1],
            ['name' => 'Urban Style Pereira', 'address' => 'Calle 12 #9-18, Pereira', 'phone' => '63357607', 'lat' => 4.8128, 'lng' => -75.6920, 'city_id' => 1],
            ['name' => 'Pro Barber Pereira', 'address' => 'Carrera 8 #15-22, Pereira', 'phone' => '63357608', 'lat' => 4.8145, 'lng' => -75.6902, 'city_id' => 1],
            ['name' => 'Barbería Central Bogotá', 'address' => 'Carrera 7 #71-20, Bogotá', 'phone' => '60123456', 'lat' => 4.7120, 'lng' => -74.0730, 'city_id' => 2],
            ['name' => 'Cut Masters Bogotá', 'address' => 'Calle 85 #12-30, Bogotá', 'phone' => '60123457', 'lat' => 4.7130, 'lng' => -74.0740, 'city_id' => 2],
            ['name' => 'Elite Style Medellín', 'address' => 'Carrera 43 #7-50, Medellín', 'phone' => '604123456', 'lat' => 6.2480, 'lng' => -75.5660, 'city_id' => 3],
            ['name' => 'Premium Cuts Cali', 'address' => 'Carrera 66 #9-38, Cali', 'phone' => '602123456', 'lat' => 3.4520, 'lng' => -76.5330, 'city_id' => 4],
            ['name' => 'Royal Groom Cartag', 'address' => 'Carrera 10 #4-25, Cartagena', 'phone' => '605123456', 'lat' => 10.3920, 'lng' => -75.4840, 'city_id' => 5],
            ['name' => 'Barbería DF Centro', 'address' => 'Av. Reforma 500, Ciudad de México', 'phone' => '52551234', 'lat' => 19.4330, 'lng' => -99.1340, 'city_id' => 6],
            ['name' => 'Mexico Style GDL', 'address' => 'Av. López Mateos 1200, Guadalajara', 'phone' => '333123456', 'lat' => 20.6600, 'lng' => -103.3500, 'city_id' => 7],
            ['name' => 'Monterrey Cuts', 'address' => 'Av. Constitución 2500, Monterrey', 'phone' => '811234567', 'lat' => 25.6870, 'lng' => -100.3170, 'city_id' => 8],
            ['name' => 'NYC Barber Co', 'address' => '5th Avenue 500, Nueva York', 'phone' => '1212555123', 'lat' => 40.7130, 'lng' => -74.0070, 'city_id' => 9],
            ['name' => 'LA Style Barbers', 'address' => 'Hollywood Blvd 6800, Los Ángeles', 'phone' => '1323555123', 'lat' => 34.0530, 'lng' => -118.2440, 'city_id' => 10],
            ['name' => 'Miami Cuts Lounge', 'address' => 'Ocean Drive 1000, Miami', 'phone' => '130555123', 'lat' => 25.7620, 'lng' => -80.1920, 'city_id' => 11],
            ['name' => 'Madrid Barber Co', 'address' => 'Gran Vía 25, Madrid', 'phone' => '914123456', 'lat' => 40.4170, 'lng' => -3.7040, 'city_id' => 12],
            ['name' => 'Barcelona Cuts', 'address' => 'Paseo de Gracia 100, Barcelona', 'phone' => '932123456', 'lat' => 41.3860, 'lng' => 2.1740, 'city_id' => 13],
            ['name' => 'Lima Style Barber', 'address' => 'Av. Larco 500, Lima', 'phone' => '112345678', 'lat' => -12.0470, 'lng' => -77.0430, 'city_id' => 14],
        ];

        foreach ($barberShops as $shop) {
            $barberShop = BarberShop::create($shop);

// License will be created by LicenseSeeder

            Service::create(['name' => 'Corte de cabello', 'price' => rand(25000, 45000), 'duration_minutes' => 30, 'barber_shop_id' => $barberShop->id]);
            Service::create(['name' => 'Afeitado de barba', 'price' => rand(20000, 35000), 'duration_minutes' => 20, 'barber_shop_id' => $barberShop->id]);
            Service::create(['name' => 'Corte + Barba', 'price' => rand(45000, 70000), 'duration_minutes' => 45, 'barber_shop_id' => $barberShop->id]);

            for ($i = 0; $i < rand(2, 4); $i++) {
                Barber::create([
                    'name' => 'Barbero ' . ($i + 1) . ' ' . $barberShop->name,
                    'email' => 'barber' . ($i + 1) . strtolower(str_replace(' ', '', $barberShop->name)) . '@gmail.com',
                    'phone' => '3' . rand(100000000, 999999999),
                    'barber_shop_id' => $barberShop->id,
                    'specialty' => 'Cortes',
                ]);
            }

            for ($j = 0; $j < rand(8, 15); $j++) {
                $client = Client::create([
                    'name' => 'Cliente ' . ($j + 1) . ' ' . $barberShop->name,
                    'email' => 'cliente' . ($j + 1) . strtolower(str_replace(' ', '', $barberShop->name)) . '@gmail.com',
                    'phone' => '3' . rand(100000000, 999999999),
                    'barber_shop_id' => $barberShop->id,
                ]);

                $barbers = $barberShop->barbers;
                $services = $barberShop->services;
                
                for ($k = 0; $k < rand(5, 15); $k++) {
                    Appointment::create([
                        'barber_shop_id' => $barberShop->id,
                        'barber_id' => $barbers->random()->id,
                        'client_id' => $client->id,
                        'service_id' => $services->random()->id,
                        'date' => now()->subDays(rand(1, 90))->format('Y-m-d'),
                        'time' => sprintf('%02d:00', rand(9, 19)),
                        'status' => ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'][rand(0, 3)],
                        'price' => rand(25000, 70000),
                        'paid' => rand(0, 1) == 1,
                    ]);
                }
            }
        }

        $this->command->info('Seeded: ' . BarberShop::count() . ' barberías en ' . City::count() . ' ciudades de ' . Country::count() . ' países');
    }
}