<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Loyalty\Models\LoyaltyCard;
use App\Modules\Loyalty\Models\LoyaltyProgram;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoyaltyAndNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reward_can_be_redeemed_once_and_audit_and_notice_are_atomic(): void
    {
        [$user, $card] = $this->card();
        Sanctum::actingAs($user);
        $key = (string) Str::uuid();
        $this->postJson('/api/loyalty/mine/' . $card->id . '/redeem', ['idempotency_key' => $key])->assertOk();
        $this->postJson('/api/loyalty/mine/' . $card->id . '/redeem', ['idempotency_key' => $key])->assertOk();
        $this->assertSame(1, $card->fresh()->rewards_redeemed);
        $this->assertDatabaseCount('loyalty.loyalty_transactions', 1);
        $this->assertDatabaseCount('marketing.notifications', 1);
        $this->postJson('/api/loyalty/mine/' . $card->id . '/redeem', ['idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
    }

    public function test_foreign_and_expired_rewards_cannot_be_redeemed(): void
    {
        [$owner, $card] = $this->card();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/loyalty/mine/' . $card->id . '/redeem', ['idempotency_key' => (string) Str::uuid()])->assertNotFound();
        Sanctum::actingAs($owner);
        $card->program->update(['valid_until' => now()->subDays(2)->toDateString()]);
        $this->postJson('/api/loyalty/mine/' . $card->id . '/redeem', ['idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        $this->assertSame(0, $card->fresh()->rewards_redeemed);
    }

    public function test_inbox_preserves_both_sources_and_denies_foreign_reads(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $legacy = \App\Models\Notification::create(['user_id' => $user->id, 'title' => 'Anterior', 'message' => 'Mensaje', 'read' => false]);
        $current = Notification::create(['user_id' => $user->id, 'title' => 'Actual', 'message' => 'Mensaje', 'read' => false]);
        $foreign = Notification::create(['user_id' => $other->id, 'title' => 'Privado', 'message' => 'Mensaje', 'read' => false]);
        Sanctum::actingAs($user);
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(2, 'notifications')->assertJsonPath('unread', 2);
        $this->postJson('/api/notifications/platform-' . $foreign->id . '/read')->assertNotFound();
        $this->postJson('/api/notifications/platform-' . $current->id . '/read')->assertOk();
        $this->postJson('/api/notifications/' . $legacy->id . '/read')->assertOk();
        $this->getJson('/api/notifications')->assertJsonPath('unread', 0);
    }

    private function card(): array
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $business = Business::factory()->create();
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        $program = LoyaltyProgram::create(['business_id' => $business->id, 'name' => 'Visitas', 'stamps_required' => 5,
            'reward_description' => 'Servicio gratis', 'active' => true]);
        $card = LoyaltyCard::create(['business_id' => $business->id, 'client_id' => $client->id,
            'loyalty_program_id' => $program->id, 'current_stamps' => 5, 'reward_available' => true]);
        return [$user, $card];
    }
}
