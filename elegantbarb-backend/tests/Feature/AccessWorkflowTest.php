<?php

namespace Tests\Feature;

use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Reviews\Models\Review;
use App\Services\CampaignService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccessWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();
        Bus::fake([ProcessCampaignJob::class]);
        Mail::fake();
        $this->admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $this->business = Business::factory()->create(['owner_user_id' => $this->admin->id]);
        Sanctum::actingAs($this->admin);
    }

    public function test_campaign_html_is_sanitized_and_foreign_recipient_ids_are_excluded(): void
    {
        $own = Client::factory()->create(['business_id' => $this->business->id]);
        $other = Client::factory()->create();
        $response = $this->postJson('/api/campaigns', [
            'subject' => 'Novedades', 'body' => '<p><strong>Hola</strong><script>alert(1)</script><img src="https://example.test/a.jpg" onerror="alert(1)"><a href="javascript:alert(1)">Link</a></p>',
            'type' => 'NEWS', 'target_role' => 'CLIENTE', 'target_ids' => [$own->id, $other->id],
        ])->assertCreated();
        $body = $response->json('body');
        $this->assertStringContainsString('<strong>Hola</strong>', $body);
        $this->assertStringNotContainsString('<script', $body);
        $this->assertStringNotContainsString('onerror', $body);
        $this->assertStringNotContainsString('javascript:', $body);
        $campaign = Campaign::findOrFail($response->json('id'));
        $recipients = app(CampaignService::class)->getRecipients($this->business->id, 'CLIENTE', $campaign->target_ids);
        $this->assertSame([$own->id], $recipients->pluck('id')->all());
        $this->postJson('/api/campaigns/'.$campaign->id.'/send')->assertOk();
        $this->postJson('/api/campaigns/'.$campaign->id.'/send')->assertStatus(400);
        Bus::assertDispatchedTimes(ProcessCampaignJob::class, 1);
        Mail::assertNothingSent();
    }

    public function test_campaign_details_and_mutations_require_business_ownership(): void
    {
        $other = Business::factory()->create();
        $campaign = Campaign::create(['user_id' => $other->owner_user_id, 'business_id' => $other->id,
            'subject' => 'Privada', 'body' => '<p>Privada</p>', 'type' => 'NEWS', 'target_role' => 'CLIENTE', 'status' => 'DRAFT']);
        $this->getJson('/api/campaigns/'.$campaign->id.'/stats')->assertForbidden();
        $this->postJson('/api/campaigns/'.$campaign->id.'/send')->assertForbidden();
        $this->deleteJson('/api/campaigns/'.$campaign->id)->assertForbidden();
        Bus::assertNotDispatched(ProcessCampaignJob::class);
    }

    public function test_promotion_crud_and_stats_are_real_and_scoped(): void
    {
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        $payload = ['title' => 'Visita', 'description' => 'Beneficio', 'type' => 'PORCENTAJE', 'discount' => 15,
            'start_date' => now()->format('Y-m-d'), 'end_date' => now()->addWeek()->format('Y-m-d'),
            'active' => true, 'promo_code' => 'VISITA', 'services' => [['id' => $service->id, 'discount' => 15, 'type' => 'PORCENTAJE']]];
        $id = $this->postJson('/api/v2/promotions', $payload)->assertCreated()->json('data.id');
        $this->getJson('/api/v2/promotions/manage')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v2/promotions/'.$id.'/stats')->assertOk()->assertJsonPath('data.total_redemptions', 0);
        $this->putJson('/api/v2/promotions/'.$id, array_replace($payload, ['discount' => 101]))->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/v2/promotions/'.$id.'/stats')->assertForbidden();
        $this->deleteJson('/api/v2/promotions/'.$id)->assertForbidden();
    }

    public function test_completed_appointment_review_is_owned_unique_and_does_not_expose_client_contacts(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $client = Client::factory()->create(['business_id' => $this->business->id, 'user_id' => $user->id]);
        $appointment = $this->appointment($client, 'COMPLETED');
        Sanctum::actingAs($user);
        $payload = ['appointment_id' => $appointment->id, 'rating' => 5, 'comment' => 'Excelente'];
        $this->postJson('/api/v2/reviews', $payload)->assertCreated()->assertJsonPath('data.business_id', $this->business->id);
        $this->postJson('/api/v2/reviews', $payload)->assertUnprocessable();
        $this->assertSame(1, Review::count());
        $this->getJson('/api/v2/reviews')->assertOk()->assertJsonMissingPath('data.data.0.client.email');
    }

    public function test_review_rejects_uncompleted_and_foreign_appointments(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $client = Client::factory()->create(['business_id' => $this->business->id, 'user_id' => $user->id]);
        $own = $this->appointment($client, 'PENDING');
        $other = $this->appointment(Client::factory()->create(), 'COMPLETED');
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/reviews', ['appointment_id' => $own->id, 'rating' => 4])->assertUnprocessable();
        $this->postJson('/api/v2/reviews', ['appointment_id' => $other->id, 'rating' => 1])->assertForbidden();
    }

    private function appointment(Client $client, string $status): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Principal', 'address' => 'Calle 1']);
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        return Appointment::create(['business_id' => $this->business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => today()->format('Y-m-d'), 'start_time' => '10:00', 'end_time' => '10:30',
            'price' => 30000, 'final_price' => 30000, 'status' => $status, 'duration_minutes' => 30]);
    }
}
