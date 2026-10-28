<?php

namespace Database\Factories\Modules\Business\Models;

use App\Modules\Business\Models\Business;
use Illuminate\Database\Eloquent\Factories\Factory;

class BusinessFactory extends Factory
{
    protected $model = Business::class;

    public function definition(): array
    {
        return [
            'business_category_id' => function () {
                return \App\Modules\Platform\Models\BusinessCategory::firstOrCreate([
                    'slug' => 'barberia',
                ], [
                    'name' => 'Barbería',
                    'description' => 'Servicios de barbería',
                    'icon' => 'scissors',
                    'color' => '#D4AF37',
                    'sort_order' => 1,
                    'is_active' => true,
                ])->id;
            },
            'owner_user_id' => function () {
                return \App\Models\User::factory()->create()->id;
            },
            'name' => $this->faker->company,
            'slug' => $this->faker->unique()->slug,
            'is_active' => true,
        ];
    }
}
