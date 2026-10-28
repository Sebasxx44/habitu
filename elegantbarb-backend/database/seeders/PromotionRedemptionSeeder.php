<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Promotion;
use App\Models\Client;
use App\Models\PromotionRedemption;
use App\Models\BarberShop;
use Carbon\Carbon;

class PromotionRedemptionSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener la primera barbería o crear una si no existe
        $barberShop = BarberShop::first();
        if (!$barberShop) return;

        // Obtener o crear una promoción para esta barbería
        $promotion = Promotion::where('barber_shop_id', $barberShop->id)->first();
        
        if (!$promotion) {
            $promotion = Promotion::create([
                'barber_shop_id' => $barberShop->id,
                'title' => 'Promoción de Prueba',
                'description' => 'Descripción de la promoción de prueba',
                'discount' => 20.00,
                'type' => 'PORCENTAJE',
                'start_date' => Carbon::now()->subDays(10),
                'end_date' => Carbon::now()->addDays(20),
                'active' => true,
                'promo_code' => 'TEST20'
            ]);
        }

        // Obtener algunos clientes
        $clients = Client::take(5)->get();
        
        // Si no hay suficientes clientes, crear algunos
        if ($clients->count() < 5) {
            $clients = Client::factory()->count(5)->create();
        }

        foreach ($clients as $index => $client) {
            PromotionRedemption::create([
                'promotion_id' => $promotion->id,
                'client_id' => $client->id,
                'saved_amount' => rand(5, 15),
                'created_at' => Carbon::now()->subMonths(rand(0, 3))->subDays(rand(1, 28)),
            ]);
        }
    }
}
