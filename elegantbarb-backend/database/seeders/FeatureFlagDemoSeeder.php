<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FeatureFlagDemoSeeder extends Seeder
{
    public function run(): void
    {
        $flags = [
            ['name' => 'on_demand_v2', 'enabled' => true, 'user_percentage' => 100, 'description' => 'Nueva versión de on-demand'],
            ['name' => 'chat_attachments', 'enabled' => true, 'user_percentage' => 50, 'description' => 'Adjuntos en chat'],
            ['name' => 'dark_mode_default', 'enabled' => false, 'user_percentage' => 100, 'description' => 'Modo oscuro por defecto'],
            ['name' => 'advanced_analytics', 'enabled' => true, 'user_percentage' => 25, 'description' => 'Analytics avanzados para admins'],
            ['name' => 'referral_program', 'enabled' => false, 'user_percentage' => 100, 'description' => 'Programa de referidos'],
            ['name' => 'waitlist_feature', 'enabled' => true, 'user_percentage' => 100, 'description' => 'Lista de espera para cupos llenos'],
            ['name' => 'multi_language', 'enabled' => true, 'user_percentage' => 100, 'description' => 'Soporte multi-idioma'],
        ];

        foreach ($flags as $flag) {
            DB::table('platform.feature_flags')->updateOrInsert(
                ['name' => $flag['name']],
                array_merge($flag, ['created_at' => now(), 'updated_at' => now()])
            );
        }

        $this->command->info('FeatureFlagDemoSeeder: 7 feature flags creados.');
    }
}
