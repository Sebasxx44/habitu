<?php

namespace Tests\Feature;

use App\Modules\Booking\Models\SmartQueue;
use App\Modules\Booking\Models\SmartQueueEntry;
use App\Modules\Booking\Services\SmartQueueService;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartQueueIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_queue_exposes_ticket_state_without_client_or_display_secrets(): void
    {
        $queue = $this->queue();
        $service = app(SmartQueueService::class);
        $client = Client::factory()->create(['name' => 'Nombre privado', 'email' => 'private@example.test', 'phone' => '3001234567']);
        $service->joinQueue($queue->id, $client->id);
        $service->createDisplay($queue->id, 'Recepción');
        $response = $this->getJson('/api/v2/smart-queues/' . $queue->id)->assertOk()
            ->assertJsonPath('data.entries.0.ticket_number', 1)->assertJsonPath('data.estimated_wait_minutes', null);
        $this->assertArrayNotHasKey('client', $response->json('data.entries.0'));
        $this->assertArrayNotHasKey('client_id', $response->json('data.entries.0'));
        $this->assertArrayNotHasKey('displays', $response->json('data'));
        $this->assertStringNotContainsString('private@example.test', $response->getContent());
    }

    public function test_join_and_call_next_replays_do_not_duplicate_tickets_or_active_entries(): void
    {
        $queue = $this->queue();
        $service = app(SmartQueueService::class);
        $firstClient = Client::factory()->create();
        $first = $service->joinQueue($queue->id, $firstClient->id)->data;
        $retry = $service->joinQueue($queue->id, $firstClient->id)->data;
        $this->assertSame($first->id, $retry->id);
        $second = $service->joinQueue($queue->id, Client::factory()->create()->id)->data;
        $this->assertSame(2, $second->ticket_number);
        $this->assertSame($first->id, $service->callNext($queue->id)->data->id);
        $this->assertSame($first->id, $service->callNext($queue->id)->data->id);
        $this->assertSame(1, SmartQueueEntry::where('status', 'CALLED')->count());
        $service->startServing($first->id);
        $this->assertSame($first->id, $service->joinQueue($queue->id, $firstClient->id)->data->id);
        $this->assertSame($second->id, $service->callNext($queue->id)->data->id);
    }

    public function test_queue_transitions_preserve_terminal_states_and_wait_uses_observed_service_duration(): void
    {
        $queue = $this->queue();
        $service = app(SmartQueueService::class);
        $first = $service->joinQueue($queue->id, Client::factory()->create()->id)->data;
        $this->assertSame(422, $service->completeEntry($first->id)->statusCode);
        $service->callNext($queue->id);
        $service->startServing($first->id);
        $first->refresh()->update(['served_at' => now()->subMinutes(12)]);
        $service->completeEntry($first->id);
        $this->assertSame(422, $service->startServing($first->id)->statusCode);
        $this->assertSame(422, $service->cancelEntry($first->id)->statusCode);
        $service->joinQueue($queue->id, Client::factory()->create()->id);
        $this->assertEqualsWithDelta(12, $service->getQueueStatus($queue->id)->data['estimated_wait_minutes'], 1);
    }

    public function test_client_can_join_and_cancel_own_ticket_but_cannot_operate_queue_or_cancel_others(): void
    {
        $queue = $this->queue();
        $client = Client::factory()->create();
        $client->user->update(['role' => 'CLIENTE', 'cliente_id' => $client->id]);
        \Laravel\Sanctum\Sanctum::actingAs($client->user->fresh());
        $entry = $this->postJson('/api/v2/smart-queues/' . $queue->id . '/join', ['client_id' => $client->id])->assertCreated()->json('data.id');
        $this->postJson('/api/v2/smart-queues/' . $queue->id . '/call-next', [])->assertForbidden();
        $other = app(SmartQueueService::class)->joinQueue($queue->id, Client::factory()->create()->id)->data;
        $this->postJson('/api/v2/smart-queues/entries/' . $other->id . '/cancel', [])->assertForbidden();
        $this->postJson('/api/v2/smart-queues/entries/' . $entry . '/cancel', [])->assertOk();
    }

    private function queue(): SmartQueue
    {
        return SmartQueue::create(['business_id' => Business::factory()->create()->id, 'name' => 'Principal', 'status' => 'ACTIVE']);
    }
}
