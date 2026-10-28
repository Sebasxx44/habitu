<?php

namespace Database\Factories\Modules\Catalog\Models;

use App\Modules\Catalog\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'business_id' => function () {
                return \App\Modules\Business\Models\Business::factory()->create()->id;
            },
            'service_category_id' => null,
            'name' => $this->faker->words(2, true),
            'description' => $this->faker->sentence,
            'price' => 30000,
            'duration_minutes' => 45,
            'is_active' => true,
        ];
    }
}
