<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Campaign;
use App\Models\CampaignLog;
use App\Models\Client;

class CampaignLogSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener la última campaña o crear una si no existe
        $campaign = Campaign::latest()->first();
        
        if (!$campaign) {
            $campaign = Campaign::create([
                'user_id' => 1,
                'barber_shop_id' => 1,
                'subject' => 'Campaña de Prueba con Analíticas',
                'body' => '<p>Hola, esta es una campaña de prueba para ver las analíticas.</p>',
                'type' => 'PROMO',
                'status' => 'COMPLETED',
                'target_role' => 'CLIENTE',
                'recipients_count' => 10,
                'sent_count' => 8,
                'sent_at' => now(),
            ]);
        }

        $clients = Client::take(10)->get();

        foreach ($clients as $index => $client) {
            CampaignLog::create([
                'campaign_id' => $campaign->id,
                'recipient_email' => $client->email,
                'recipient_name' => $client->name,
                'status' => $index < 8 ? 'SENT' : 'FAILED',
                'error_message' => $index < 8 ? null : 'SMTP Connection Timeout',
            ]);
        }
    }
}
