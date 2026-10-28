<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LoyaltyCardDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');
        $clientId = DB::table('people.clients')->where('user_id', $clientUserId)->value('id');

        if (! $clientId) {
            $this->command->warn('LoyaltyCardDemoSeeder: cliente demo no encontrado.');
            return;
        }

        $programs = DB::table('loyalty.loyalty_programs')->get();
        if ($programs->isEmpty()) {
            $this->command->warn('LoyaltyCardDemoSeeder: no hay programas de fidelidad.');
            return;
        }

        foreach ($programs as $program) {
            $stamps = rand(0, $program->stamps_required);
            $completed = $stamps >= $program->stamps_required;

            $cardId = DB::table('loyalty.loyalty_cards')->insertGetId([
                'loyalty_program_id' => $program->id,
                'client_id' => $clientId,
                'business_id' => $program->business_id,
                'current_stamps' => $stamps,
                'total_stamps_ever' => $stamps + rand(0, 5),
                'rewards_redeemed' => $completed ? 1 : 0,
                'reward_available' => $completed,
                'status' => $completed ? 'COMPLETED' : 'ACTIVE',
                'last_stamp_at' => $now->copy()->subDays(rand(1, 10)),
                'created_at' => $now->copy()->subDays(rand(10, 60)),
                'updated_at' => $now,
            ]);

            // Loyalty transactions (earns)
            for ($i = 0; $i < min($stamps, 5); $i++) {
                DB::table('loyalty.loyalty_transactions')->insert([
                    'client_id' => $clientId,
                    'points' => 10,
                    'type' => 'EARN',
                    'appointment_id' => null,
                    'loyalty_card_id' => $cardId,
                    'description' => 'Sello por visita demo',
                    'created_at' => $now->copy()->subDays(rand(1, 30)),
                ]);
            }

            // Redeem transaction
            if ($completed) {
                DB::table('loyalty.loyalty_transactions')->insert([
                    'client_id' => $clientId,
                    'points' => -$program->stamps_required * 10,
                    'type' => 'REDEEM',
                    'appointment_id' => null,
                    'loyalty_card_id' => $cardId,
                    'description' => $program->reward_description,
                    'created_at' => $now->copy()->subDays(5),
                ]);
            }
        }

        $this->command->info('LoyaltyCardDemoSeeder: tarjetas y transacciones de fidelidad creadas.');
    }
}
