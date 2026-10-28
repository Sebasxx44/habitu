<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Campaign;
use App\Models\BarberShop;
use App\Models\User;
use App\Models\Client;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        $shop = BarberShop::first();
        if (!$shop) return;

        $admin = User::where('role', 'ADMIN_BARBERIA')->where('barber_shop_id', $shop->id)->first();
        if (!$admin) return;

        $clients = Client::where('barber_shop_id', $shop->id)->limit(5)->get();
        $clientIds = $clients->pluck('id')->toArray();

        // 1. Promo Campaign
        Campaign::create([
            'user_id' => $admin->id,
            'barber_shop_id' => $shop->id,
            'subject' => '🔥 ¡20% de Descuento este fin de semana!',
            'body' => '<h1>¡Hola!</h1><p>Queremos invitarte a lucir tu mejor versión. Usa el código <strong>FINDE20</strong> y obtén un descuento especial.</p><img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800" alt="Barber" />',
            'type' => 'PROMO',
            'status' => 'COMPLETED',
            'target_role' => 'CLIENTE',
            'target_ids' => json_encode($clientIds),
            'recipients_count' => count($clientIds),
            'sent_count' => count($clientIds),
            'sent_at' => now()->subDays(2),
        ]);

        // 2. News Campaign
        Campaign::create([
            'user_id' => $admin->id,
            'barber_shop_id' => $shop->id,
            'subject' => '✨ Nueva Sede en el Norte',
            'body' => '<h2>¡Estamos creciendo!</h2><p>Gracias a tu preferencia, abrimos una nueva sucursal con tecnología de punta y los mejores barberos del país.</p>',
            'type' => 'NEWS',
            'status' => 'COMPLETED',
            'target_role' => 'CLIENTE',
            'recipients_count' => 150,
            'sent_count' => 148,
            'sent_at' => now()->subDays(10),
        ]);

        // 3. Reminder / Internal
        $barbers = User::where('role', 'PROFESSIONAL')->where('barber_shop_id', $shop->id)->get();
        $barberIds = $barbers->pluck('id')->toArray();

        Campaign::create([
            'user_id' => $admin->id,
            'barber_shop_id' => $shop->id,
            'subject' => '📅 Nueva Capacitación Técnica',
            'body' => '<p>Estimado equipo, este lunes tendremos una sesión sobre <u>técnicas de degradado avanzado</u>. La asistencia es obligatoria.</p>',
            'type' => 'REMINDER',
            'status' => 'COMPLETED',
            'target_role' => 'PROFESSIONAL',
            'target_ids' => json_encode($barberIds),
            'recipients_count' => count($barberIds),
            'sent_count' => count($barberIds),
            'sent_at' => now()->subDay(),
        ]);
    }
}
