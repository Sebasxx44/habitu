<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformExtensionsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // ─── 1. Subscription Plans ───────────────────────────────────────────────
        $plans = [
            [
                'name' => 'Básico',
                'slug' => 'basico',
                'description' => 'Perfecto para probar la plataforma. Incluye 2 servicios al mes con descuento.',
                'billing_cycle' => 'MONTHLY',
                'price' => 29000,
                'currency' => 'COP',
                'credits_per_cycle' => 2,
                'max_appointments_per_cycle' => 2,
                'max_on_demand_per_cycle' => 1,
                'discount_percentage' => 10,
                'included_services' => json_encode(['Corte', 'Barba']),
                'features' => json_encode(['2 servicios/mes', '10% descuento', 'Sin comisión por reserva']),
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Premium',
                'slug' => 'premium',
                'description' => 'El favorito de nuestros clientes. 5 servicios al mes y 15% de descuento.',
                'billing_cycle' => 'MONTHLY',
                'price' => 59000,
                'currency' => 'COP',
                'credits_per_cycle' => 5,
                'max_appointments_per_cycle' => 5,
                'max_on_demand_per_cycle' => 3,
                'discount_percentage' => 15,
                'included_services' => json_encode(['Corte', 'Barba', 'Facial', 'Color']),
                'features' => json_encode(['5 servicios/mes', '15% descuento', 'Acceso prioritario', 'Sin comisión']),
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'VIP',
                'slug' => 'vip',
                'description' => 'Experiencia ilimitada. Servicios sin límite y 25% de descuento permanente.',
                'billing_cycle' => 'MONTHLY',
                'price' => 99000,
                'currency' => 'COP',
                'credits_per_cycle' => 10,
                'max_appointments_per_cycle' => null,
                'max_on_demand_per_cycle' => 10,
                'discount_percentage' => 25,
                'included_services' => json_encode(['Todos los servicios']),
                'features' => json_encode(['Servicios ilimitados', '25% descuento', 'Atención VIP', 'Sin comisión', 'Entrega express']),
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('subscriptions.plans')->updateOrInsert(
                ['slug' => $plan['slug']],
                $plan
            );
        }
        $this->command->info('3 subscription plans created/updated.');

        // ─── 2. Wallets for existing users ──────────────────────────────────────
        $userIds = DB::table('public.users')->pluck('id')->toArray();
        foreach ($userIds as $userId) {
            DB::table('finance.wallets')->updateOrInsert(
                ['user_id' => $userId],
                [
                    'balance' => random_int(0, 200000),
                    'hold_balance' => 0,
                    'currency' => 'COP',
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
        $this->command->info('Wallets created/updated for ' . count($userIds) . ' users.');

        // ─── 3. Sample Wallet Transactions ─────────────────────────────────────
        $wallets = DB::table('finance.wallets')->pluck('id', 'user_id')->toArray();
        $txTypes = ['CREDIT', 'DEBIT', 'CASHBACK', 'REFUND', 'TOPUP'];
        foreach (array_slice($wallets, 0, 5, true) as $userId => $walletId) {
            for ($i = 0; $i < 5; $i++) {
                $type = $txTypes[array_rand($txTypes)];
                $amount = random_int(10000, 100000);
                $balanceBefore = random_int(0, 150000);
                $balanceAfter = in_array($type, ['DEBIT', 'PAYOUT']) ? max(0, $balanceBefore - $amount) : $balanceBefore + $amount;
                DB::table('finance.wallet_transactions')->insert([
                    'wallet_id' => $walletId,
                    'user_id' => $userId,
                    'type' => $type,
                    'amount' => $amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'status' => 'COMPLETED',
                    'description' => 'Transacción demo ' . ($i + 1),
                    'created_at' => $now->copy()->subDays(random_int(1, 30)),
                    'updated_at' => $now,
                ]);
            }
        }
        $this->command->info('Sample wallet transactions created.');

        // ─── 4. Ads ────────────────────────────────────────────────────────────
        $businessIds = DB::table('business.businesses')->pluck('id')->toArray();
        if (!empty($businessIds)) {
            $ads = [
                [
                    'business_id' => $businessIds[0],
                    'title' => 'Descuento de bienvenida',
                    'description' => '20% off en tu primera visita. ¡Reserva ahora!',
                    'image_url' => 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80',
                    'link_url' => '/cliente/business/' . $businessIds[0],
                    'placement' => 'HOME',
                    'start_date' => now()->subWeek(),
                    'end_date' => now()->addMonth(),
                    'status' => 'ACTIVE',
                    'priority' => 10,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'business_id' => $businessIds[1] ?? $businessIds[0],
                    'title' => 'Nuevo servicio: Spa Premium',
                    'description' => 'Relájate con nuestro nuevo paquete de spa.',
                    'image_url' => 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
                    'link_url' => '/cliente/business/' . ($businessIds[1] ?? $businessIds[0]),
                    'placement' => 'HOME',
                    'start_date' => now()->subDays(3),
                    'end_date' => now()->addWeeks(2),
                    'status' => 'ACTIVE',
                    'priority' => 5,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ];
            DB::table('marketing.ads')->insert($ads);
            $this->command->info('2 demo ads created.');
        }

        // ─── 5. Promotions ─────────────────────────────────────────────────────
        $firstBusinessId = DB::table('business.businesses')->value('id') ?? 1;
        $promotions = [
            [
                'business_id' => $firstBusinessId,
                'title' => 'Bienvenida Nuevo Usuario',
                'description' => '20% de descuento en tu primera visita',
                'promo_code' => 'BIENVENIDO20',
                'type' => 'PERCENTAGE',
                'discount' => 20,
                'start_date' => now()->subMonth(),
                'end_date' => now()->addMonths(3),
                'usage_limit' => 1000,
                'usage_count' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'business_id' => $firstBusinessId,
                'title' => 'Happy Hour Martes',
                'description' => '15% de descuento los martes',
                'promo_code' => 'MARTES15',
                'type' => 'PERCENTAGE',
                'discount' => 15,
                'start_date' => now(),
                'end_date' => now()->addMonths(2),
                'usage_limit' => 500,
                'usage_count' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'business_id' => $firstBusinessId,
                'title' => 'Cashback Lunes',
                'description' => '$10.000 de cashback en compras mayores a $50.000',
                'promo_code' => 'CASHBACK10K',
                'type' => 'FIXED',
                'discount' => 99.99,
                'start_date' => now(),
                'end_date' => now()->addMonth(),
                'usage_limit' => 200,
                'usage_count' => 0,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
        DB::table('marketing.promotions')->insert($promotions);
        $this->command->info('3 demo promotions created.');

        $this->command->info('PlatformExtensionsSeeder completed successfully.');
    }
}
