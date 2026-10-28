<?php

namespace Database\Factories\Modules\Marketing\Models;

use App\Modules\Marketing\Models\Promotion;
use Illuminate\Database\Eloquent\Factories\Factory;

class PromotionFactory extends Factory
{
    protected $model = Promotion::class;

    public function definition(): array
    {
        return [
            'business_id' => function () {
                $user = \App\Models\User::factory()->create();
                $category = \App\Modules\Platform\Models\BusinessCategory::create([
                    'name' => 'Barbería',
                    'slug' => 'barberia',
                    'description' => 'Servicios de barbería',
                    'icon' => 'scissors',
                    'color' => '#D4AF37',
                    'sort_order' => 1,
                    'is_active' => true,
                ]);
                $business = \App\Modules\Business\Models\Business::create([
                    'business_category_id' => $category->id,
                    'owner_user_id' => $user->id,
                    'name' => 'Demo Business',
                    'slug' => 'demo-business',
                    'is_active' => true,
                ]);
                return $business->id;
            },
            'title' => $this->faker->sentence(3),
            'promo_code' => strtoupper($this->faker->unique()->bothify('PROMO###')),
            'type' => 'PERCENTAGE',
            'discount' => 15.00,
            'start_date' => now()->subDay(),
            'end_date' => now()->addDays(30),
            'usage_limit' => 100,
            'usage_count' => 0,
            'is_active' => true,
        ];
    }
}
