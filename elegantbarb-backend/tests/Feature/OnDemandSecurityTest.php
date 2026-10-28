<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\OnDemand\Events\OnDemandStatusUpdated;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnDemandSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_can_only_create_read_and_cancel_owned_requests(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $client = Client::factory()->create(['user_id' => $user->id]);
        $other = OnDemandRequest::factory()->create();
        Sanctum::actingAs($user);
        $payload = ['client_lat' => 4.6, 'client_lng' => -74, 'client_address' => 'Calle 1'];
        $this->postJson('/api/v2/on-demand/request', $payload + ['client_id' => $other->client_id])->assertForbidden();
        $id = $this->postJson('/api/v2/on-demand/request', $payload)->assertCreated()->json('data.id');
        $this->assertSame($client->id, OnDemandRequest::findOrFail($id)->client_id);
        $this->getJson('/api/v2/on-demand/'.$other->id)->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$other->id.'/cancel', ['reason' => 'No'])->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$id.'/update-status', ['status' => 'COMPLETED'])->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$id.'/accept')->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$id.'/cancel', ['reason' => 'Cambio de planes'])->assertOk();
        $this->postJson('/api/v2/on-demand/'.$id.'/cancel', ['reason' => 'Repetida'])->assertStatus(400);
    }

    public function test_professional_requires_pending_offer_and_assigned_owner_for_status(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        [$user, $professional] = $this->professional();
        [, $otherProfessional] = $this->professional($professional->business_id);
        $request = OnDemandRequest::factory()->create(['search_expires_at' => now()->addMinutes(5)]);
        OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $professional->id,
            'status' => 'PENDING', 'offered_at' => now()]);
        $other = OnDemandRequest::factory()->create(['business_id' => $professional->business_id,
            'professional_id' => $otherProfessional->id, 'status' => 'ACCEPTED']);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/on-demand')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v2/on-demand/'.$other->id)->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$other->id.'/update-status', ['status' => 'ON_THE_WAY'])->assertForbidden();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertOk();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertStatus(400);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED'])->assertStatus(400);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'ON_THE_WAY'])->assertOk();
        Event::assertDispatched(OnDemandStatusUpdated::class, fn ($event) => $event->oldStatus === 'SEARCHING' && $event->newStatus === 'ACCEPTED');
    }

    public function test_expired_offer_cannot_be_accepted_and_status_events_are_private(): void
    {
        [$user, $professional] = $this->professional();
        $request = OnDemandRequest::factory()->create(['search_expires_at' => now()->subMinute()]);
        OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $professional->id,
            'status' => 'PENDING', 'offered_at' => now()->subMinutes(10)]);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertForbidden();
        $event = new OnDemandStatusUpdated($request, 'SEARCHING', 'CANCELLED');
        foreach ($event->broadcastOn() as $channel) $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('SEARCHING', $request->fresh()->status);
    }

    private function professional(?int $businessId = null): array
    {
        $user = User::factory()->create(['role' => 'PROFESSIONAL']);
        $professional = Professional::create(['user_id' => $user->id,
            'business_id' => $businessId ?? Business::factory()->create()->id,
            'name' => $user->name, 'email' => $user->email, 'is_active' => true]);
        return [$user, $professional];
    }
}
