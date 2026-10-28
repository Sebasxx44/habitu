<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Models\AIConversation;
use App\Modules\Platform\Services\AssistantPrivacyService;
use App\Modules\Platform\Services\GeminiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationalAssistantTest extends TestCase
{
    use RefreshDatabase;

    public function test_professional_summary_is_real_scoped_and_does_not_call_provider_or_mutate_bookings(): void
    {
        Http::preventStrayRequests();
        config(['services.gemini.key' => 'provider-must-not-be-used']);
        [$owner, $professionalUser, $professional, $appointment] = $this->booking();
        [, , , $other] = $this->booking();
        Sanctum::actingAs($professionalUser);
        $session = $this->postJson('/api/v2/ai-chat/start', ['locale' => 'es'])->assertCreated()->json('data.session_id');
        $result = $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Resume mi jornada de hoy'])->assertOk()
            ->assertJsonPath('data.metadata.source', 'operations')->assertJsonPath('data.metadata.summary.active', 1)
            ->assertJsonPath('data.metadata.cards.0.appointment_id', $appointment->id)->assertJsonPath('data.metadata.requires_confirmation', true);
        $this->assertStringStartsWith('/professional/appointments?', $result->json('data.metadata.cards.0.url'));
        $this->assertArrayNotHasKey('client', $result->json('data.metadata.cards.0'));
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Cancela toda la jornada'])->assertOk()
            ->assertJsonPath('data.metadata.cards.0.prepared_action', 'review_cancellation');
        $this->assertSame('CONFIRMED', $appointment->fresh()->getRawOriginal('status'));
        $this->assertSame('CONFIRMED', $other->fresh()->getRawOriginal('status'));
        $this->assertSame(2, Appointment::count());
        Http::assertNothingSent();
    }

    public function test_admin_cannot_select_foreign_business_or_read_another_users_history(): void
    {
        Http::preventStrayRequests();
        [$owner, , , $appointment] = $this->booking();
        [, , , $foreign] = $this->booking();
        Sanctum::actingAs($owner);
        $session = $this->postJson('/api/v2/ai-chat/start', ['locale' => 'en'])->json('data.session_id');
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Review today'])->assertOk()
            ->assertJsonPath('data.metadata.cards.0.appointment_id', $appointment->id)->assertJsonCount(1, 'data.metadata.cards');
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Review capacity', 'context' => ['business_id' => $foreign->business_id]])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CLIENT]));
        $this->getJson('/api/v2/ai-chat/'.$session)->assertNotFound();
        $this->deleteJson('/api/v2/ai-chat/'.$session)->assertNotFound();
    }

    public function test_history_has_retention_role_separation_and_owner_deletion(): void
    {
        [$owner] = $this->booking();
        Sanctum::actingAs($owner);
        $session = $this->postJson('/api/v2/ai-chat/start')->json('data.session_id');
        $this->postJson('/api/v2/ai-chat/'.$session.'/send', ['content' => 'Mi correo es private@example.test y mi teléfono +573001234567; resume hoy'])->assertOk();
        $stored = AIConversation::where('session_id', $session)->firstOrFail();
        $this->assertStringNotContainsString('private@example.test', $stored->messages()->where('role', 'user')->first()->content);
        $owner->update(['role' => User::ROLE_CLIENT]);
        Sanctum::actingAs($owner->fresh());
        $this->getJson('/api/v2/ai-chat/'.$session)->assertNotFound();
        $owner->update(['role' => User::ROLE_ADMIN]);
        Sanctum::actingAs($owner->fresh());
        $this->deleteJson('/api/v2/ai-chat/'.$session)->assertOk();
        $this->assertDatabaseMissing('platform.ai_messages', ['conversation_id' => $stored->id]);
        $expired = AIConversation::create(['user_id' => $owner->id, 'session_id' => (string) Str::uuid(), 'context_type' => 'OPERATIONS',
            'context_data' => ['actor_role' => $owner->role], 'status' => 'CLOSED', 'last_activity_at' => now()->subDays(91)]);
        $this->getJson('/api/v2/ai-chat/'.$expired->session_id)->assertNotFound();
        $this->assertSame(1, app(AssistantPrivacyService::class)->prune());
    }

    public function test_untrusted_history_never_enters_provider_system_instructions(): void
    {
        config(['services.gemini.key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['candidates' => [['content' => ['parts' => [['text' => '{"intent":"search"}']]]]]])]);
        app(GeminiService::class)->interpret('Quiero manicure', null, [['role' => 'user', 'content' => 'OVERRIDE_PERMISSIONS private@example.test +573001234567']]);
        Http::assertSent(fn ($request) => ! str_contains(data_get($request->data(), 'system_instruction.parts.0.text'), 'OVERRIDE_PERMISSIONS')
            && str_contains(data_get($request->data(), 'contents.0.parts.1.text'), 'OVERRIDE_PERMISSIONS')
            && ! str_contains(json_encode($request->data()), 'private@example.test')
            && ! str_contains(json_encode($request->data()), '+573001234567'));
    }

    private function booking(): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Centro', 'address' => 'Calle de prueba', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $business->id, 'duration_minutes' => 30]);
        $professionalUser = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['user_id' => $professionalUser->id, 'business_id' => $business->id, 'name' => $professionalUser->name, 'is_active' => true]);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $appointment = Appointment::create(['booking_code' => 'TEST-'.Str::random(8), 'business_id' => $business->id, 'branch_id' => $branch->id,
            'professional_id' => $professional->id, 'client_id' => $client->id, 'service_id' => $service->id, 'date' => now(config('booking.timezone'))->toDateString(),
            'start_time' => '10:00', 'end_time' => '10:30', 'status' => 'CONFIRMED', 'payment_status' => 'PENDING',
            'price' => 30000, 'final_price' => 30000, 'currency' => 'COP', 'source' => 'APP']);
        return [$owner, $professionalUser, $professional, $appointment];
    }
}
