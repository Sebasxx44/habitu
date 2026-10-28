<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use Database\Seeders\Demo\BenefitsDemoSeeder;
use Database\Seeders\Demo\DemoData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BenefitsDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_replay_preserves_consumed_rewards_and_promotion_limits_without_paid_memberships(): void
    {
        User::factory()->create(['email' => DemoData::CLIENT_EMAIL, 'role' => User::ROLE_CLIENT]);
        foreach ([DemoData::BUSINESS_SLUG, 'demo-spa-botanico', 'demo-canchas-arena'] as $slug) {
            $business = Business::factory()->create(['slug' => $slug, 'is_active' => true]);
            Service::factory()->create(['business_id' => $business->id, 'is_active' => true]);
        }
        $this->seed(BenefitsDemoSeeder::class);
        $this->assertSame(6, Promotion::count());
        $this->assertSame(6, LoyaltyCard::count());
        $this->assertSame(9, MembershipPlan::count());
        $this->assertSame(1, ClientMembership::count());
        $membership = ClientMembership::firstOrFail();
        $this->assertSame('0.00', $membership->plan_snapshot['price']);
        $membership->update(['status' => 'CANCELLED', 'appointments_remaining' => 0]);
        $this->assertSame(6, DB::table('loyalty.loyalty_transactions')->count());
        $card = LoyaltyCard::where('reward_available', true)->firstOrFail();
        $card->update(['current_stamps' => 0, 'reward_available' => false, 'rewards_redeemed' => 1]);
        $promotion = Promotion::firstOrFail();
        $promotion->update(['usage_count' => 100, 'is_active' => false]);
        $this->seed(BenefitsDemoSeeder::class);
        $this->assertSame(0, $card->fresh()->current_stamps);
        $this->assertSame(1, $card->fresh()->rewards_redeemed);
        $this->assertFalse($card->fresh()->reward_available);
        $this->assertSame(100, $promotion->fresh()->usage_count);
        $this->assertFalse($promotion->fresh()->is_active);
        $this->assertSame(6, Promotion::count());
        $this->assertSame(6, LoyaltyCard::count());
        $this->assertSame(9, MembershipPlan::count());
        $this->assertSame(6, DB::table('loyalty.loyalty_transactions')->count());
        $this->assertSame(1, ClientMembership::count());
        $this->assertSame('CANCELLED', $membership->fresh()->status);
        $this->assertSame(0, $membership->fresh()->appointments_remaining);
    }
}
