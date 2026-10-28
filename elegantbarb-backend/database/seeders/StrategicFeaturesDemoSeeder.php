<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StrategicFeaturesDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding strategic features (badges, queues, memberships)...');

        // 1. Gamification Badges
        $badges = [
            ['name' => 'Primer Corte', 'slug' => 'first-cut', 'description' => 'Agenda tu primera cita', 'icon' => 'Scissors', 'color' => '#D4AF37', 'category' => 'BOOKING', 'required_points' => 100, 'conditions' => json_encode(['appointments_count' => 1])],
            ['name' => 'Cliente Frecuente', 'slug' => 'regular-client', 'description' => 'Completa 10 citas', 'icon' => 'CalendarCheck', 'color' => '#D4AF37', 'category' => 'BOOKING', 'required_points' => 500, 'conditions' => json_encode(['appointments_count' => 10])],
            ['name' => 'Reseñador', 'slug' => 'reviewer', 'description' => 'Deja 5 reseñas', 'icon' => 'Star', 'color' => '#F59E0B', 'category' => 'SOCIAL', 'required_points' => 300, 'conditions' => json_encode(['reviews_count' => 5])],
            ['name' => 'Embajador', 'slug' => 'ambassador', 'description' => 'Refiere a 3 amigos', 'icon' => 'Users', 'color' => '#10B981', 'category' => 'SOCIAL', 'required_points' => 800, 'conditions' => json_encode(['referrals_count' => 3])],
            ['name' => 'Maestro', 'slug' => 'master', 'description' => 'Alcanza el nivel 10', 'icon' => 'Crown', 'color' => '#8B5CF6', 'category' => 'MASTERY', 'required_points' => 10000, 'conditions' => json_encode(['level' => 10])],
            ['name' => 'Racha Semanal', 'slug' => 'weekly-streak', 'description' => 'Citas 3 semanas seguidas', 'icon' => 'Zap', 'color' => '#EF4444', 'category' => 'LOYALTY', 'required_points' => 600, 'conditions' => json_encode(['streak_weeks' => 3])],
            ['name' => 'Explorador', 'slug' => 'explorer', 'description' => 'Visita 5 barberías diferentes', 'icon' => 'Compass', 'color' => '#3B82F6', 'category' => 'BOOKING', 'required_points' => 400, 'conditions' => json_encode(['unique_businesses' => 5])],
        ];

        foreach ($badges as $badge) {
            DB::table('platform.gamification_badges')->updateOrInsert(
                ['slug' => $badge['slug']],
                array_merge($badge, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }

        // 2. Smart Queue for first business
        $businessId = DB::table('business.businesses')->value('id');
        if ($businessId) {
            $queueId = DB::table('booking.smart_queues')->insertGetId([
                'business_id' => $businessId,
                'name' => 'Fila Principal',
                'status' => 'ACTIVE',
                'current_number' => 0,
                'estimated_wait_minutes' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('booking.smart_queue_displays')->insert([
                'queue_id' => $queueId,
                'display_name' => 'Pantalla Principal',
                'display_code' => 'DISP01',
                'settings' => json_encode(['sound' => true, 'theme' => 'dark']),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Membership Plans for first business
        if ($businessId) {
            $plans = [
                ['name' => 'Básico', 'slug' => 'basico', 'description' => '4 cortes al mes con 10% descuento', 'price' => 80000, 'billing_cycle' => 'MONTHLY', 'appointments_included' => 4, 'discount_percentage' => 10, 'benefits' => json_encode(['4 cortes incluidos', '10% descuento en productos', 'Prioridad de agendamiento'])],
                ['name' => 'Premium', 'slug' => 'premium', 'description' => '8 cortes al mes con 20% descuento', 'price' => 150000, 'billing_cycle' => 'MONTHLY', 'appointments_included' => 8, 'discount_percentage' => 20, 'benefits' => json_encode(['8 cortes incluidos', '20% descuento en productos', 'Acceso a barbero premium', 'Bebida gratis'])],
                ['name' => 'VIP Anual', 'slug' => 'vip-anual', 'description' => 'Cortes ilimitados y beneficios exclusivos', 'price' => 1200000, 'billing_cycle' => 'YEARLY', 'appointments_included' => 52, 'discount_percentage' => 30, 'benefits' => json_encode(['Cortes ilimitados', '30% descuento en productos', 'Barbero personal asignado', 'Eventos exclusivos'])],
            ];

            foreach ($plans as $plan) {
                DB::table('subscriptions.membership_plans')->updateOrInsert(
                    ['business_id' => $businessId, 'slug' => $plan['slug']],
                    array_merge($plan, [
                        'business_id' => $businessId,
                        'currency' => 'COP',
                        'included_services' => json_encode([]),
                        'is_active' => true,
                        'sort_order' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])
                );
            }
        }

        // 4. Dynamic Pricing Rules for first business
        if ($businessId) {
            $rules = [
                ['rule_type' => 'PEAK_HOUR', 'conditions' => json_encode(['day_of_week' => 5, 'hour_start' => 17, 'hour_end' => 20]), 'multiplier' => 1.25, 'priority' => 10],
                ['rule_type' => 'PEAK_HOUR', 'conditions' => json_encode(['day_of_week' => 6, 'hour_start' => 10, 'hour_end' => 18]), 'multiplier' => 1.15, 'priority' => 9],
                ['rule_type' => 'DEMAND', 'conditions' => json_encode(['min_demand' => 7]), 'multiplier' => 1.10, 'priority' => 5],
            ];

            foreach ($rules as $rule) {
                DB::table('platform.dynamic_pricing_rules')->insert(array_merge($rule, [
                    'business_id' => $businessId,
                    'service_id' => null,
                    'flat_adjustment' => null,
                    'is_active' => true,
                    'starts_at' => null,
                    'ends_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }

        $this->command->info('Strategic features seeded successfully!');
    }
}
