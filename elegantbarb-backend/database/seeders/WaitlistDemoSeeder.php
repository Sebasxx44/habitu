<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WaitlistDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');
        $clientId = DB::table('people.clients')->where('user_id', $clientUserId)->value('id');

        if (! $clientId) {
            $this->command->warn('WaitlistDemoSeeder: cliente demo no encontrado.');
            return;
        }

        $business = DB::table('business.businesses')->first();
        $service = DB::table('catalog.services')->where('business_id', $business?->id)->first();
        $professional = DB::table('people.professionals')->where('business_id', $business?->id)->first();

        if (! $business || ! $service) {
            $this->command->warn('WaitlistDemoSeeder: faltan negocio/servicio.');
            return;
        }

        $entries = [
            ['status' => 'PENDING', 'date' => $now->copy()->addDays(3)->toDateString()],
            ['status' => 'PENDING', 'date' => $now->copy()->addDays(5)->toDateString()],
            ['status' => 'NOTIFIED', 'date' => $now->copy()->addDay()->toDateString()],
            ['status' => 'CONVERTED', 'date' => $now->copy()->subDays(2)->toDateString()],
            ['status' => 'EXPIRED', 'date' => $now->copy()->subDays(5)->toDateString()],
        ];

        foreach ($entries as $entry) {
            DB::table('booking.waitlists')->insert([
                'client_id' => $clientId,
                'business_id' => $business->id,
                'service_id' => $service->id,
                'professional_id' => $professional?->id,
                'preferred_date' => $entry['date'],
                'preferred_time_start' => '10:00:00',
                'preferred_time_end' => '18:00:00',
                'status' => $entry['status'],
                'notified_at' => $entry['status'] === 'NOTIFIED' ? $now->copy()->subHours(2) : null,
                'expires_at' => in_array($entry['status'], ['PENDING', 'NOTIFIED']) ? $now->copy()->addDays(7) : null,
                'created_at' => $now->copy()->subDays(rand(1, 10)),
                'updated_at' => $now,
            ]);
        }

        $this->command->info('WaitlistDemoSeeder: 5 entradas de lista de espera creadas.');
    }
}
