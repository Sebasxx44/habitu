<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Review;
use App\Models\Campaign;
use App\Models\City;
use App\Models\Country;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class RealisticDataSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password123');

        // Create Default Country and City if not exists
        $country = Country::firstOrCreate(['name' => 'General', 'code' => 'GEN']);
        $city = City::firstOrCreate(
            ['name' => 'Metropolis', 'country_id' => $country->id],
            ['lat' => 0, 'lng' => 0]
        );

        // 1. Create Superadmin
        User::updateOrCreate(
            ['email' => 'superadmin@elegantbarb.com'],
            ['name' => 'Super Administrador', 'password' => $password, 'role' => 'SUPERADMIN']
        );

        $shopsConfig = [
            [
                'name' => 'Lima Style Barber',
                'lat' => '4.8133',
                'lng' => '-75.6961',
                'banner_url' => 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80'
            ],
            [
                'name' => 'Madrid Barber Co',
                'lat' => '4.8055',
                'lng' => '-75.6890',
                'banner_url' => 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80'
            ],
            [
                'name' => 'Miami Cuts Lounge',
                'lat' => '4.8390',
                'lng' => '-75.6705',
                'banner_url' => 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=800&q=80'
            ]
        ];

        $servicesList = [
            ['name' => 'Corte Moderno', 'price' => 25.00],
            ['name' => 'Corte + Barba', 'price' => 40.00],
            ['name' => 'Perfilado Premium', 'price' => 15.00]
        ];

        foreach ($shopsConfig as $shopIndex => $config) {
            $shopName = $config['name'];
            $shopPrefix = strtolower(explode(' ', $shopName)[0]); // lima, madrid, miami

            // 2. Create BarberShop
            $shop = BarberShop::updateOrCreate(
                ['email' => "contacto@{$shopPrefix}.com"],
                [
                    'name' => $shopName,
                    'phone' => '12345678' . $shopIndex,
                    'address' => "Avenida Principal {$shopIndex}00",
                    'city_id' => $city->id,
                    'active' => true,
                    'lat' => $config['lat'],
                    'lng' => $config['lng'],
                    'banner_url' => $config['banner_url']
                ]
            );

            // 3. Create Admin for this Shop
            $admin = User::updateOrCreate(
                ['email' => "admin@{$shopPrefix}.com"],
                [
                    'name' => "Admin {$shopName}",
                    'password' => $password,
                    'role' => 'ADMIN_BARBERIA',
                    'barber_shop_id' => $shop->id
                ]
            );

            // 4. Create Services for this Shop
            $shopServices = [];
            foreach ($servicesList as $s) {
                $shopServices[] = Service::updateOrCreate(
                    ['name' => $s['name'], 'barber_shop_id' => $shop->id],
                    ['price' => $s['price'], 'duration_minutes' => 45]
                );
            }

            // 5. Create Campaigns for this Shop
            for ($c = 1; $c <= 3; $c++) {
                Campaign::updateOrCreate(
                    ['subject' => "Campaña {$c} - {$shopName}", 'barber_shop_id' => $shop->id],
                    [
                        'user_id' => $admin->id,
                        'body' => 'Este es el contenido de la campaña promocional.',
                        'type' => 'PROMO',
                        'status' => 'SENT',
                        'sent_count' => rand(50, 200),
                        'created_at' => Carbon::now()->subDays(rand(1, 30))
                    ]
                );
            }

            // 6. Create 3 Barbers for this Shop
            for ($b = 1; $b <= 3; $b++) {
                $barberEmail = "barbero{$b}@{$shopPrefix}.com";
                
                $barber = Barber::updateOrCreate(
                    ['email' => $barberEmail],
                    [
                        'name' => "Barbero {$b} {$shopPrefix}",
                        'barber_shop_id' => $shop->id,
                        'phone' => "3000000{$shopIndex}{$b}",
                        'specialty' => 'Master Barber',
                        'commission_percentage' => 50,
                        'active' => true
                    ]
                );

                // Create User for Barber
                User::updateOrCreate(
                    ['email' => $barberEmail],
                    [
                        'name' => $barber->name,
                        'password' => $password,
                        'role' => 'PROFESSIONAL',
                        'barber_shop_id' => $shop->id,
                        'barber_id' => $barber->id
                    ]
                );

                // 7. Create 3 Clients per Barber (9 per shop)
                for ($cl = 1; $cl <= 3; $cl++) {
                    $clientEmail = "cliente{$cl}_b{$b}@{$shopPrefix}.com";
                    
                    $client = Client::updateOrCreate(
                        ['email' => $clientEmail],
                        [
                            'name' => "Cliente {$cl} (Barbero {$b})",
                            'phone' => "3100000{$shopIndex}{$b}{$cl}",
                            'barber_shop_id' => $shop->id,
                            'loyalty_points' => rand(10, 100)
                        ]
                    );

                    // Create User for Client
                    User::updateOrCreate(
                        ['email' => $clientEmail],
                        [
                            'name' => $client->name,
                            'password' => $password,
                            'role' => 'CLIENTE',
                            'cliente_id' => $client->id
                        ]
                    );

                    // 8. Create History (Appointments, Payments, Reviews)
                    $statuses = ['COMPLETADA', 'COMPLETADA', 'PENDIENTE'];
                    $payments = ['Tarjeta', 'Efectivo', 'Transferencia'];

                    for ($a = 0; $a < rand(2, 5); $a++) {
                        $service = $shopServices[array_rand($shopServices)];
                        $status = $statuses[array_rand($statuses)];
                        
                        $app = Appointment::create([
                            'barber_shop_id' => $shop->id,
                            'barber_id' => $barber->id,
                            'client_id' => $client->id,
                            'service_id' => $service->id,
                            'date' => Carbon::now()->subDays(rand(0, 60))->format('Y-m-d'),
                            'time' => rand(9, 18) . ':00',
                            'status' => $status,
                            'price' => $service->price,
                            'paid' => ($status === 'COMPLETADA') ? 1 : 0,
                            'payment_method' => $payments[array_rand($payments)],
                            'gallery' => ($status === 'COMPLETADA' && rand(0,1)) ? ['/mock/haircut1.png'] : []
                        ]);

                        if ($status === 'COMPLETADA') {
                            Review::create([
                                'barber_shop_id' => $shop->id,
                                'client_id' => $client->id,
                                'rating' => rand(4, 5),
                                'comment' => 'Excelente servicio y atención.'
                            ]);
                        }
                    }
                }
            }
        }
    }
}
