<?php

namespace Database\Seeders;

use App\Models\BarberShop;
use App\Models\License;
use App\Models\Plan;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class LicenseSeeder extends Seeder
{
    public function run(): void
    {
        $plans = Plan::all();
        $shops = BarberShop::all();

        if ($plans->isEmpty() || $shops->isEmpty()) {
            $this->command->warn('No plans or shops found, skipping license seeding');
            return;
        }

        foreach ($shops as $index => $shop) {
            $plan = $plans[$index % $plans->count()];
            
            // Mix of statuses for realistic data
            $status = match($index % 6) {
                0 => License::STATUS_ACTIVE,
                1 => License::STATUS_TRIAL,
                2 => License::STATUS_ACTIVE,
                3 => License::STATUS_EXPIRED,
                4 => License::STATUS_PAST_DUE,
                5 => License::STATUS_CANCELLED,
            };

            $startsAt = Carbon::now()->subDays(rand(1, 90));
            $expiresAt = match($status) {
                License::STATUS_ACTIVE => Carbon::now()->addDays(rand(10, 60)),
                License::STATUS_TRIAL => Carbon::now()->addDays(rand(3, 14)),
                License::STATUS_EXPIRED => Carbon::now()->subDays(rand(1, 30)),
                License::STATUS_PAST_DUE => Carbon::now()->subDays(rand(1, 7)),
                License::STATUS_CANCELLED => Carbon::now()->subDays(rand(15, 45)),
                default => Carbon::now()->addDays(30),
            };

            $trialEndsAt = $status === License::STATUS_TRIAL ? $expiresAt : null;

            License::create([
                'barber_shop_id' => $shop->id,
                'plan_id' => $plan->id,
                'status' => $status,
                'billing_cycle' => rand(0, 1) ? 'monthly' : 'annual',
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'trial_ends_at' => $trialEndsAt,
                'amount_paid' => $status === License::STATUS_ACTIVE ? $plan->monthly_price : 0,
            ]);
        }

        $this->command->info("Seeded {$shops->count()} licenses");
    }
}