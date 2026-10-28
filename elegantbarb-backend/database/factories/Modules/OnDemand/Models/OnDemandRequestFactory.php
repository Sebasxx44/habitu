<?php

namespace Database\Factories\Modules\OnDemand\Models;

use App\Modules\OnDemand\Models\OnDemandRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

class OnDemandRequestFactory extends Factory
{
    protected $model = OnDemandRequest::class;

    public function definition(): array
    {
        return [
            'client_id' => function () {
                return \App\Modules\People\Models\Client::factory()->create()->id;
            },
            'business_id' => null,
            'service_id' => null,
            'professional_id' => null,
            'request_code' => strtoupper($this->faker->unique()->bothify('REQ######')),
            'status' => 'SEARCHING',
            'estimated_price' => 35000,
            'currency' => 'COP',
            'client_lat' => 4.8143,
            'client_lng' => -75.6901,
            'client_address' => 'Calle 123',
        ];
    }
}
