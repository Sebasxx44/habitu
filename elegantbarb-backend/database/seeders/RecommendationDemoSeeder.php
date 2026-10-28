<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RecommendationDemoSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $clientUserId = DB::table('public.users')->where('email', 'cliente@elegantbarb.com')->value('id');

        if (! $clientUserId) {
            $this->command->warn('RecommendationDemoSeeder: usuario demo no encontrado.');
            return;
        }

        $businesses = DB::table('business.businesses')->pluck('id')->toArray();
        $services = DB::table('catalog.services')->pluck('id')->toArray();

        for ($i = 0; $i < 20; $i++) {
            DB::table('platform.recommendation_logs')->insert([
                'user_id' => $clientUserId,
                'recommendation_type' => ['AI', 'TRENDING', 'NEARBY', 'SIMILAR', 'PROMOTED'][rand(0, 4)],
                'recommendable_type' => 'App\\Modules\\Business\\Models\\Business',
                'recommendable_id' => !empty($businesses) ? $businesses[array_rand($businesses)] : 1,
                'score' => rand(60, 99) / 100,
                'algorithm' => 'HYBRID',
                'factors' => json_encode(['demo' => true]),
                'was_clicked' => rand(0, 3) === 0,
                'was_booked' => rand(0, 10) === 0,
                'created_at' => $now->copy()->subDays(rand(0, 30)),
                'updated_at' => $now,
            ]);
        }

        $this->command->info('RecommendationDemoSeeder: 20 logs de recomendación creados.');
    }
}
