<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LoyaltyProgram;
use App\Models\LoyaltyCard;
use App\Models\Client;
use App\Models\BarberShop;
use App\Models\Appointment;
use App\Models\Barber;
use App\Models\Service;

class LoyaltySeeder extends Seeder
{
    public function run(): void
    {
        $shop = BarberShop::first();
        if (!$shop) return;

        // Create a default program
        $program = LoyaltyProgram::create([
            'barber_shop_id' => $shop->id,
            'name' => 'Corte Gratis',
            'description' => 'Por cada 5 cortes, obtén 1 gratis.',
            'type' => 'STAMP',
            'stamps_required' => 5,
            'reward_description' => '1 Corte Gratis',
            'active' => true,
        ]);

        // Get some clients
        $clients = Client::where('barber_shop_id', $shop->id)->take(10)->get();
        $barber = Barber::where('barber_shop_id', $shop->id)->first();
        $service = Service::where('barber_shop_id', $shop->id)->first();

        foreach ($clients as $index => $client) {
            // Create cards with different progress
            $stamps = ($index % 5) + 1; // 1, 2, 3, 4, 5
            
            $card = LoyaltyCard::create([
                'loyalty_program_id' => $program->id,
                'client_id' => $client->id,
                'barber_shop_id' => $shop->id,
                'current_stamps' => $stamps >= 5 ? 5 : $stamps,
                'total_stamps_ever' => $stamps + ($index * 2),
                'rewards_redeemed' => $index % 3,
                'reward_available' => $stamps >= 5,
                'status' => 'ACTIVE',
                'last_stamp_at' => now()->subDays($index),
            ]);

            // Create some history for this client
            for ($i = 0; $i < $stamps; $i++) {
                Appointment::create([
                    'barber_shop_id' => $shop->id,
                    'barber_id' => $barber->id,
                    'client_id' => $client->id,
                    'service_id' => $service->id,
                    'date' => now()->subDays($i * 7)->format('Y-m-d'),
                    'time' => '10:00',
                    'status' => 'COMPLETADA',
                    'price' => $service->price,
                    'paid' => true,
                ]);
            }
        }
    }
}
