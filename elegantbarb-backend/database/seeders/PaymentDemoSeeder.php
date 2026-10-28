<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaymentDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');
        $clientId = DB::table('people.clients')->where('user_id', $clientUserId)->value('id');

        if (! $clientId) {
            $this->command->warn('PaymentDemoSeeder: cliente demo no encontrado.');
            return;
        }

        $business = DB::table('business.businesses')->first();
        $appointment = DB::table('booking.appointments')->where('client_id', $clientId)->first();

        if (! $business) {
            $this->command->warn('PaymentDemoSeeder: negocio no encontrado.');
            return;
        }

        // Payments (ajustado a la migración real de finance.payments)
        $statuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
        for ($i = 0; $i < 6; $i++) {
            $status = $statuses[$i % count($statuses)];
            DB::table('finance.payments')->insert([
                'appointment_id' => $appointment?->id,
                'client_id' => $clientId,
                'business_id' => $business->id,
                'amount' => rand(25000, 150000),
                'currency' => 'COP',
                'method' => $i % 2 === 0 ? 'MERCADOPAGO' : 'WALLET',
                'external_transaction_id' => $status === 'COMPLETED' ? 'MP-' . rand(1000000, 9999999) : null,
                'status' => $status,
                'gateway_response' => json_encode(['demo' => true]),
                'paid_at' => $status === 'COMPLETED' ? $now->copy()->subDays(rand(1, 30)) : null,
                'refunded_at' => $status === 'REFUNDED' ? $now->copy()->subDays(rand(1, 5)) : null,
                'created_at' => $now->copy()->subDays(rand(1, 30)),
                'updated_at' => $now,
            ]);
        }

        // Wallet topups
        for ($i = 0; $i < 4; $i++) {
            DB::table('finance.wallet_topups')->insert([
                'user_id' => $clientUserId,
                'amount' => [50000, 100000, 200000, 50000][$i],
                'external_reference' => 'WALLET-TOPUP-' . $clientUserId . '-' . time() . $i,
                'preference_id' => 'PREF-' . strtoupper(bin2hex(random_bytes(8))),
                'status' => $i < 3 ? 'COMPLETED' : 'PENDING',
                'payment_id' => $i < 3 ? 'MP-' . rand(1000000, 9999999) : null,
                'created_at' => $now->copy()->subDays(rand(1, 15)),
                'updated_at' => $now,
            ]);
        }

        // Withdrawals
        $profUserId = DB::table('public.users')->where('email', 'professional@elegantbarb.com')->value('id');
        if ($profUserId) {
            DB::table('finance.withdrawals')->insert([
                'user_id' => $profUserId,
                'amount' => 150000,
                'bank_name' => 'Bancolombia',
                'bank_account' => '12345678901',
                'status' => 'PENDING',
                'processed_at' => null,
                'created_at' => $now->copy()->subDays(2),
                'updated_at' => $now,
            ]);
            DB::table('finance.withdrawals')->insert([
                'user_id' => $profUserId,
                'amount' => 200000,
                'bank_name' => 'Davivienda',
                'bank_account' => '98765432109',
                'status' => 'COMPLETED',
                'processed_at' => $now->copy()->subDays(10),
                'created_at' => $now->copy()->subDays(10),
                'updated_at' => $now,
            ]);
        }

        $this->command->info('PaymentDemoSeeder: 6 pagos, 4 topups, 2 retiros creados.');
    }
}
