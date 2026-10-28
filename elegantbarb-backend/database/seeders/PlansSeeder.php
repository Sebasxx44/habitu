<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Básico',
                'slug' => 'basico',
                'description' => 'Perfecto para barberías que recién empiezan',
                'monthly_price' => 49000,
                'annual_price' => 470000,
                'max_barbers' => 2,
                'max_clients' => 200,
                'max_appointments_monthly' => 300,
                'has_reports' => false,
                'has_campaigns' => false,
                'has_whatsapp' => false,
                'has_payments' => true,
                'has_loyalty' => true,
                'has_custom_domain' => false,
                'trial_days' => 14,
            ],
            [
                'name' => 'Profesional',
                'slug' => 'profesional',
                'description' => 'La mejor opción para barberías en crecimiento',
                'monthly_price' => 99000,
                'annual_price' => 950000,
                'max_barbers' => 5,
                'max_clients' => 1000,
                'max_appointments_monthly' => 1500,
                'has_reports' => true,
                'has_campaigns' => true,
                'has_whatsapp' => true,
                'has_payments' => true,
                'has_loyalty' => true,
                'has_custom_domain' => false,
                'is_popular' => true,
                'trial_days' => 14,
            ],
            [
                'name' => 'Premium',
                'slug' => 'premium',
                'description' => 'Para barberías que quieren dominar el mercado',
                'monthly_price' => 199000,
                'annual_price' => 1900000,
                'max_barbers' => 15,
                'max_clients' => 5000,
                'max_appointments_monthly' => 5000,
                'has_reports' => true,
                'has_campaigns' => true,
                'has_whatsapp' => true,
                'has_payments' => true,
                'has_loyalty' => true,
                'has_custom_domain' => true,
                'trial_days' => 14,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }

        $this->command->info('Seeded 3 plans');
    }
}