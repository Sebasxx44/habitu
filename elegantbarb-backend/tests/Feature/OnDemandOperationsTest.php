<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\OnDemand\Events\OnDemandStatusUpdated;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Professional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnDemandOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_accepting_a_general_request_associates_the_professionals_business(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $business = Business::factory()->create();
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => $business->id,
            'name' => $user->name, 'email' => $user->email, 'phone' => '+573001234567', 'is_active' => true]);
        $request = OnDemandRequest::factory()->create(['business_id' => null, 'search_expires_at' => now()->addMinutes(5)]);
        OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $professional->id,
            'status' => 'PENDING', 'offered_at' => now()]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertOk()
            ->assertJsonPath('data.business_id', $business->id)
            ->assertJsonPath('data.professional_id', $professional->id);
        $this->getJson('/api/v2/on-demand')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.professional.phone', '+573001234567');
        $this->assertSame($business->id, $request->fresh()->business_id);
    }

    public function test_professional_cannot_accept_an_offer_for_a_different_business(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id,
            'name' => $user->name, 'email' => $user->email, 'is_active' => true]);
        $request = OnDemandRequest::factory()->create(['business_id' => Business::factory()->create()->id,
            'search_expires_at' => now()->addMinutes(5)]);
        OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $professional->id,
            'status' => 'PENDING', 'offered_at' => now()]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertForbidden();
        $this->assertSame('SEARCHING', $request->fresh()->status);
        $this->assertNull($request->fresh()->professional_id);
    }

    public function test_final_value_is_validated_and_only_recorded_on_completion(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id,
            'name' => $user->name, 'email' => $user->email, 'is_active' => true]);
        $request = OnDemandRequest::factory()->create(['business_id' => $professional->business_id,
            'professional_id' => $professional->id, 'status' => 'ACCEPTED']);
        Sanctum::actingAs($user);

        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'ON_THE_WAY', 'final_price' => 100])
            ->assertUnprocessable();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'ON_THE_WAY'])->assertOk();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'IN_PROGRESS'])->assertOk();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED', 'final_price' => -1])
            ->assertUnprocessable();
        $this->assertNull($request->fresh()->final_price);
        $quote = $this->postJson('/api/v2/on-demand/'.$request->id.'/price-quote', ['amount' => 58000, 'reason' => 'Cliente solicita un servicio adicional.'])->assertOk()->json('data.id');
        $clientUser = $request->client->user;
        $clientUser->update(['role' => User::ROLE_CLIENT]);
        Sanctum::actingAs($clientUser);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/price-quote/accept', ['quote_id' => $quote])->assertOk();
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED', 'final_price' => 58000])
            ->assertOk()->assertJsonPath('data.status', 'COMPLETED')->assertJsonPath('data.final_price', '58000.00');
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED', 'final_price' => 1])
            ->assertStatus(400);
        $this->assertSame('58000.00', $request->fresh()->final_price);
    }
}
