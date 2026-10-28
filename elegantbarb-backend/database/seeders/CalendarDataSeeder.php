<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Appointment;
use App\Models\BarberShop;
use App\Models\Barber;
use App\Models\Client;
use App\Models\Service;
use Carbon\Carbon;

class CalendarDataSeeder extends Seeder
{
    public function run()
    {
        $shops = BarberShop::all();
        
        foreach ($shops as $shop) {
            $barbers = Barber::where('barber_shop_id', $shop->id)->get();
            $clients = Client::where('barber_shop_id', $shop->id)->get();
            $services = Service::where('barber_shop_id', $shop->id)->get();

            if ($barbers->isEmpty() || $clients->isEmpty() || $services->isEmpty()) continue;

            // Clear existing appointments for this shop
            Appointment::where('barber_shop_id', $shop->id)->delete();

            $statuses = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'];
            $paymentMethods = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];
            
            $today = Carbon::today();
            
            // Seed for the last 3 days, today, and the next 3 days
            for ($i = -3; $i <= 3; $i++) {
                $date = (clone $today)->addDays($i);
                
                foreach ($barbers as $barber) {
                    // Seed more appointments for "today" (6-9) and some for other days (3-5)
                    $numAppts = $i === 0 ? rand(6, 9) : rand(3, 5);
                    $startHour = 8;
                    
                    for ($j = 0; $j < $numAppts; $j++) {
                        $client = $clients->random();
                        $service = $services->random();
                        
                        // Spread appointments throughout the day
                        $hour = $startHour + ($j * 1.5) + (rand(0, 30) / 60); 
                        if ($hour >= 21) break;

                        $timeStr = sprintf('%02d:%02d:00', floor($hour), (rand(0, 1) * 30));

                        Appointment::create([
                            'barber_shop_id' => $shop->id,
                            'barber_id' => $barber->id,
                            'client_id' => $client->id,
                            'service_id' => $service->id,
                            'date' => $date->format('Y-m-d'),
                            'time' => $timeStr,
                            'status' => $date->isPast() && !$date->isToday() ? 'COMPLETADA' : $statuses[array_rand($statuses)],
                            'price' => $service->price,
                            'paid' => ($date->isPast() && !$date->isToday()) || rand(0, 1),
                            'payment_method' => $paymentMethods[array_rand($paymentMethods)]
                        ]);
                    }
                }
            }
        }
    }
}
