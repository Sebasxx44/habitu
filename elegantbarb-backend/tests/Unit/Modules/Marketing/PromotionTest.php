<?php

namespace Tests\Unit\Modules\Marketing;

use App\Modules\Marketing\Models\Promotion;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PromotionTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_promotion(): void
    {
        $promo = Promotion::factory()->create([
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
            'usage_limit' => 10,
            'usage_count' => 5,
        ]);

        $this->assertTrue($promo->isValid());
    }

    public function test_expired_promotion_is_invalid(): void
    {
        $promo = Promotion::factory()->create([
            'is_active' => true,
            'starts_at' => now()->subDays(10),
            'ends_at' => now(config('booking.timezone'))->subDay()->toDateString(),
        ]);

        $this->assertFalse($promo->isValid());
    }

    public function test_usage_limit_reached(): void
    {
        $promo = Promotion::factory()->create([
            'is_active' => true,
            'usage_limit' => 5,
            'usage_count' => 5,
        ]);

        $this->assertFalse($promo->isValid());
    }

    public function test_percentage_discount_calculation(): void
    {
        $promo = Promotion::factory()->create([
            'type' => 'PERCENTAGE',
            'value' => 20,
        ]);

        $discount = $promo->calculateDiscount(100000);
        $this->assertEquals(20000, $discount);
    }

    public function test_fixed_discount_calculation(): void
    {
        $promo = Promotion::factory()->create([
            'type' => 'FIXED',
            'value' => 15000,
        ]);

        $discount = $promo->calculateDiscount(100000);
        $this->assertEquals(15000, $discount);
    }

    public function test_max_discount_cap(): void
    {
        $promo = Promotion::factory()->create([
            'type' => 'PERCENTAGE',
            'value' => 50,
            'max_discount' => 30000,
        ]);

        $discount = $promo->calculateDiscount(100000);
        $this->assertEquals(30000, $discount);
    }
}
