<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WebhookDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $adminId = DB::table('public.users')->where('email', 'admin@elegantbarb.com')->value('id');

        if (! $adminId) {
            $this->command->warn('WebhookDemoSeeder: admin demo no encontrado.');
            return;
        }

        $webhookId = DB::table('platform.outgoing_webhooks')->insertGetId([
            'user_id' => $adminId,
            'name' => 'Zapier Integration',
            'url' => 'https://hooks.zapier.com/hooks/catch/demo/12345',
            'secret' => bin2hex(random_bytes(16)),
            'events' => json_encode(['appointment.created', 'appointment.updated', 'on-demand.completed']),
            'active' => true,
            'timeout' => 30,
            'retry_count' => 3,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('platform.webhook_deliveries')->insert([
            [
                'webhook_id' => $webhookId,
                'event' => 'appointment.created',
                'payload' => json_encode(['appointment_id' => 1, 'client' => 'Juan Pérez']),
                'status_code' => 200,
                'response_body' => '{"status":"ok"}',
                'error_message' => null,
                'attempt' => 1,
                'sent_at' => $now->copy()->subHours(2),
                'completed_at' => $now->copy()->subHours(2),
                'created_at' => $now->copy()->subHours(2),
                'updated_at' => $now,
            ],
            [
                'webhook_id' => $webhookId,
                'event' => 'appointment.updated',
                'payload' => json_encode(['appointment_id' => 2, 'status' => 'CONFIRMED']),
                'status_code' => 200,
                'response_body' => '{"status":"ok"}',
                'error_message' => null,
                'attempt' => 1,
                'sent_at' => $now->copy()->subHours(1),
                'completed_at' => $now->copy()->subHours(1),
                'created_at' => $now->copy()->subHours(1),
                'updated_at' => $now,
            ],
            [
                'webhook_id' => $webhookId,
                'event' => 'on-demand.completed',
                'payload' => json_encode(['request_id' => 1]),
                'status_code' => 500,
                'response_body' => 'Internal Server Error',
                'error_message' => 'Timeout after 30s',
                'attempt' => 2,
                'sent_at' => $now->copy()->subMinutes(30),
                'completed_at' => null,
                'created_at' => $now->copy()->subMinutes(30),
                'updated_at' => $now,
            ],
        ]);

        $this->command->info('WebhookDemoSeeder: 1 webhook + 3 deliveries creados.');
    }
}
