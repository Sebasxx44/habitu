<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Chat\Events\MessageSent;
use App\Modules\Chat\Services\ChatRetentionService;
use App\Modules\OnDemand\Events\OnDemandStatusUpdated;
use App\Modules\OnDemand\Models\OnDemandAssignment;
use App\Modules\OnDemand\Models\OnDemandRequest;
use App\Modules\OnDemand\Services\OnDemandService;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Tracking\Models\LocationUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_contextual_chat_derives_participants_and_denies_foreign_reservations(): void
    {
        Event::fake([MessageSent::class]);
        [$client, $professional, $request] = $this->reservation();
        $outsider = User::factory()->create(['role' => User::ROLE_CLIENT]);
        Sanctum::actingAs($client);
        $conversation = $this->postJson($this->path($request).'/conversation')->assertOk()->json('data.id');
        $this->postJson('/api/v2/chat/conversations', ['on_demand_request_id' => $request->id, 'participant_ids' => [$outsider->id]])->assertOk();
        $this->assertDatabaseMissing('chat.conversation_participants', ['conversation_id' => $conversation, 'user_id' => $outsider->id]);
        $this->postJson('/api/v2/chat/conversations/'.$conversation.'/messages', ['content' => 'Ya llegué'])->assertCreated();
        Sanctum::actingAs($outsider);
        $this->postJson($this->path($request).'/conversation')->assertForbidden();
        $this->getJson('/api/v2/chat/conversations/'.$conversation)->assertForbidden();
        Sanctum::actingAs($professional);
        $this->getJson('/api/v2/chat/conversations/'.$conversation)->assertOk()->assertJsonPath('data.0.content', 'Ya llegué');
        $request->update(['professional_id' => null]);
        $this->getJson('/api/v2/chat/conversations/'.$conversation)->assertForbidden();
    }

    public function test_pin_is_bound_to_reservation_and_single_use(): void
    {
        [$client, $professional, $request] = $this->reservation();
        Sanctum::actingAs($client);
        $pin = $this->postJson($this->path($request).'/check-in/pin')->assertOk()->json('data.pin');
        $this->postJson($this->path($request).'/check-in/verify', ['pin' => $pin])->assertForbidden();
        Sanctum::actingAs($professional);
        $this->postJson($this->path($request).'/check-in/verify', ['pin' => $pin])->assertOk();
        $this->assertNotNull($request->fresh()->arrived_at);
        $this->postJson($this->path($request).'/check-in/verify', ['pin' => $pin])->assertStatus(409);
    }

    public function test_pin_blocks_after_five_attempts_and_expires(): void
    {
        [$client, $professional, $request] = $this->reservation();
        Sanctum::actingAs($client);
        $pin = $this->postJson($this->path($request).'/check-in/pin')->assertOk()->json('data.pin');
        Sanctum::actingAs($professional);
        for ($attempt = 0; $attempt < 5; $attempt++) $this->postJson($this->path($request).'/check-in/verify', ['pin' => '000000'])->assertUnprocessable();
        $this->postJson($this->path($request).'/check-in/verify', ['pin' => $pin])->assertUnprocessable();
        $this->assertDatabaseHas('booking.check_in_tokens', ['reservation_id' => $request->id, 'attempts' => 5]);
        $this->travel(16)->minutes();
        $this->postJson($this->path($request).'/check-in/verify', ['pin' => $pin])->assertUnprocessable();
        $this->assertNull($request->fresh()->arrived_at);
    }

    public function test_only_scoped_manager_can_manually_check_in_or_resolve_an_incident(): void
    {
        [$client, $professional, $request, $owner] = $this->reservation();
        Sanctum::actingAs($client);
        $case = $this->postJson($this->path($request).'/incidents', ['category' => 'DUPLICATE_CHARGE', 'description' => 'Se registraron dos cobros del mismo servicio.'])->assertCreated()->json('data');
        $this->assertNotEmpty($case['case_number']);
        $this->assertNull($case['response_due_at']);
        $this->putJson($this->path($request).'/incidents/'.$case['id'], ['status' => 'RESOLVED', 'resolution' => 'Incidencia revisada.'])->assertForbidden();
        Sanctum::actingAs($professional);
        $this->postJson($this->path($request).'/check-in/verify', ['manual_reason' => 'Cliente sin dispositivo disponible.'])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->getJson($this->path($request))->assertForbidden();
        Sanctum::actingAs($owner);
        $this->postJson($this->path($request).'/check-in/verify', ['manual_reason' => 'Cliente sin dispositivo disponible.'])->assertOk();
        $this->putJson($this->path($request).'/incidents/'.$case['id'], ['status' => 'RESOLVED', 'resolution' => 'Se verificó el soporte del servicio.'])->assertOk()->assertJsonPath('data.status', 'RESOLVED');
    }

    public function test_attachments_are_private_and_retention_removes_files_and_messages(): void
    {
        Storage::fake('local');
        Event::fake([MessageSent::class]);
        [$client, $professional, $request] = $this->reservation();
        Sanctum::actingAs($client);
        $conversation = $this->postJson($this->path($request).'/conversation')->json('data.id');
        $upload = $this->post('/api/v2/chat/conversations/'.$conversation.'/attachments', ['file' => UploadedFile::fake()->create('instructions.pdf', 20, 'application/pdf')], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $this->postJson('/api/v2/chat/conversations/'.$conversation.'/messages', ['content' => 'Instrucciones de llegada', 'attachments' => [$upload]])->assertCreated();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CLIENT]));
        $this->getJson('/api/v2/chat/conversations/'.$conversation.'/attachments/'.$upload)->assertForbidden();
        Sanctum::actingAs($professional);
        $this->get('/api/v2/chat/conversations/'.$conversation.'/attachments/'.$upload)->assertOk();
        $this->travel(91)->days();
        $this->getJson('/api/v2/chat/conversations/'.$conversation)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v2/chat/conversations/'.$conversation.'/attachments/'.$upload)->assertNotFound();
        $this->assertSame(1, app(ChatRetentionService::class)->prune());
        $this->assertDatabaseCount('chat.attachments', 0);
    }

    public function test_rejected_and_paused_offers_cannot_be_accepted_and_hide_exact_address(): void
    {
        [$client, $user, $request, $owner, $professional] = $this->reservation('SEARCHING');
        $request->update(['professional_id' => null]);
        OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $professional->id, 'status' => 'PENDING', 'offered_at' => now()]);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/on-demand/'.$request->id)->assertOk()->assertJsonPath('data.client_address', 'Zona aproximada; la dirección se comparte al aceptar.')->assertJsonMissingPath('data.client');
        $this->postJson('/api/v2/on-demand/'.$request->id.'/reject')->assertOk();
        $this->postJson('/api/v2/on-demand/'.$request->id.'/accept')->assertForbidden();
        $this->putJson('/api/v2/on-demand/presence', ['is_paused' => true])->assertOk()->assertJsonPath('data.is_paused', true);
        OnDemandAssignment::where('request_id', $request->id)->update(['status' => 'PENDING']);
        $this->assertSame(409, app(OnDemandService::class)->accept($request->id, $professional->id)->statusCode);
    }

    public function test_only_one_professional_wins_and_no_professional_accepts_two_active_requests(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        [, , $request, , $professional] = $this->reservation('SEARCHING');
        $request->update(['professional_id' => null]);
        $second = Professional::create(['user_id' => User::factory()->create(['role' => User::ROLE_PROFESSIONAL])->id, 'business_id' => $professional->business_id, 'name' => 'Otra persona', 'email' => 'second@example.test', 'is_active' => true]);
        foreach ([$professional, $second] as $person) OnDemandAssignment::create(['request_id' => $request->id, 'professional_id' => $person->id, 'status' => 'PENDING', 'offered_at' => now()]);
        $service = app(OnDemandService::class);
        $this->assertTrue($service->accept($request->id, $professional->id)->success);
        $this->assertFalse($service->accept($request->id, $second->id)->success);
        $another = OnDemandRequest::factory()->create(['business_id' => $professional->business_id, 'search_expires_at' => now()->addMinutes(5)]);
        OnDemandAssignment::create(['request_id' => $another->id, 'professional_id' => $professional->id, 'status' => 'PENDING', 'offered_at' => now()]);
        $this->assertSame(409, $service->accept($another->id, $professional->id)->statusCode);
        $this->assertSame($professional->id, $request->fresh()->professional_id);
    }

    public function test_stale_location_is_labeled_and_not_accessible_after_completion(): void
    {
        [$client, , $request, , $professional] = $this->reservation();
        LocationUpdate::create(['user_id' => $professional->user_id, 'professional_id' => $professional->id, 'lat' => 4.65, 'lng' => -74.1, 'recorded_at' => now()->subMinutes(6), 'trackable_type' => Professional::class, 'trackable_id' => $professional->id]);
        Sanctum::actingAs($client);
        $this->getJson('/api/v2/tracking/professionals/'.$professional->id.'/location')->assertOk()->assertJsonPath('data.is_stale', true);
        $request->update(['status' => 'COMPLETED']);
        $this->getJson('/api/v2/tracking/professionals/'.$professional->id.'/location')->assertForbidden();
    }

    public function test_extra_price_requires_customer_acceptance_of_current_quote(): void
    {
        Event::fake([OnDemandStatusUpdated::class]);
        [$client, $professional, $request] = $this->reservation('IN_PROGRESS');
        Sanctum::actingAs($professional);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED', 'final_price' => 58000])->assertUnprocessable();
        $quote = $this->postJson('/api/v2/on-demand/'.$request->id.'/price-quote', ['amount' => 58000, 'reason' => 'Servicio adicional solicitado por cliente.'])->assertOk()->json('data.id');
        $this->postJson('/api/v2/on-demand/'.$request->id.'/price-quote/accept', ['quote_id' => $quote])->assertForbidden();
        Sanctum::actingAs($client);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/price-quote/accept', ['quote_id' => $quote])->assertOk();
        Sanctum::actingAs($professional);
        $this->postJson('/api/v2/on-demand/'.$request->id.'/update-status', ['status' => 'COMPLETED', 'final_price' => 58000])->assertOk();
    }

    private function reservation(string $status = 'ACCEPTED'): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $clientUser = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $client = Client::factory()->create(['user_id' => $clientUser->id, 'business_id' => $business->id]);
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => $business->id, 'name' => $user->name, 'email' => $user->email, 'is_active' => true]);
        $request = OnDemandRequest::factory()->create(['client_id' => $client->id, 'business_id' => $business->id, 'professional_id' => $professional->id, 'status' => $status, 'search_expires_at' => now()->addMinutes(5)]);
        return [$clientUser, $user, $request, $owner, $professional];
    }

    private function path(OnDemandRequest $request): string
    {
        return '/api/v2/reservations/on-demand/'.$request->id;
    }
}
