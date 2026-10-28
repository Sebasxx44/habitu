<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BusinessCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Barbería', 'slug' => 'barberia', 'icon' => 'Scissors', 'color' => '#10B981', 'sort_order' => 1],
            ['name' => 'Estudio de Tatuaje', 'slug' => 'tattoo-studio', 'icon' => 'PenTool', 'color' => '#EF4444', 'sort_order' => 2],
            ['name' => 'Salón de Belleza', 'slug' => 'beauty-salon', 'icon' => 'Sparkles', 'color' => '#F472B6', 'sort_order' => 3],
            ['name' => 'Spa', 'slug' => 'spa', 'icon' => 'Droplets', 'color' => '#8B5CF6', 'sort_order' => 4],
            ['name' => 'Gimnasio', 'slug' => 'gym', 'icon' => 'Dumbbell', 'color' => '#3B82F6', 'sort_order' => 5],
            ['name' => 'Cancha de Fútbol', 'slug' => 'cancha-futbol', 'icon' => 'Goal', 'color' => '#059669', 'sort_order' => 6],
            ['name' => 'Salón de Baile', 'slug' => 'salon-baile', 'icon' => 'Music', 'color' => '#F59E0B', 'sort_order' => 7],
            ['name' => 'Entrenamiento / Running', 'slug' => 'running-club', 'icon' => 'Footprints', 'color' => '#EC4899', 'sort_order' => 8],
            ['name' => 'Espacio Recreativo', 'slug' => 'espacio-recreativo', 'icon' => 'Gamepad2', 'color' => '#6366F1', 'sort_order' => 9],
            ['name' => 'Clínica / Terapia', 'slug' => 'clinica-terapia', 'icon' => 'HeartPulse', 'color' => '#14B8A6', 'sort_order' => 10],
        ];

        foreach ($categories as $cat) {
            DB::table('platform.business_categories')->updateOrInsert(
                ['slug' => $cat['slug']],
                array_merge($cat, [
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
