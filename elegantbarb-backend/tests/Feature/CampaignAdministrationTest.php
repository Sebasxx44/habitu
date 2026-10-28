<?php

namespace Tests\Feature;

use App\Jobs\ProcessCampaignJob;
use App\Models\Campaign;
use App\Models\CampaignLog;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\Notification;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use App\Services\CampaignDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Mime\Email;
use Tests\TestCase;

class CampaignAdministrationTest extends TestCase
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

    private function payload(array $overrides = []): array
    {
        return array_replace(['business_id' => $this->business->id, 'subject' => 'Tu próximo cuidado',
            'body' => '<p>Vuelve a reservar con tus beneficios.</p>', 'type' => 'PROMO', 'target_role' => 'CLIENTE', 'segment' => []], $overrides);
    }

    private function client(array $overrides = []): Client
    {
        return Client::factory()->create(array_replace(['business_id' => $this->business->id, 'birthdate' => now()->subYears(30)->toDateString(),
            'is_vip' => true, 'tier' => 'GOLD'], $overrides));
    }

    private function promotion(?Business $business = null): Promotion
    {
        return Promotion::create(['business_id' => ($business ?? $this->business)->id, 'title' => 'Regresa', 'type' => 'PERCENTAGE',
            'discount' => 15, 'promo_code' => Str::upper(Str::random(10)), 'is_active' => true,
            'start_date' => now()->subDay(), 'end_date' => now()->addMonth()]);
    }

    private function appointment(Client $client): Appointment
    {
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        $branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede', 'address' => 'Calle 1', 'is_active' => true]);
        return Appointment::create(['business_id' => $this->business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => now()->subDays(40)->toDateString(), 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => 'COMPLETED', 'price' => 50000, 'final_price' => 40000, 'booking_code' => Str::random(12)]);
    }

    public function test_audience_preview_combines_population_visits_memberships_and_email_preferences(): void
    {
        $client = $this->client();
        $this->appointment($client);
        $plan = MembershipPlan::create(['business_id' => $this->business->id, 'name' => 'Club', 'slug' => (string) Str::uuid(),
            'price' => 0, 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 2, 'discount_percentage' => 10, 'is_active' => true]);
        ClientMembership::create(['client_id' => $client->id, 'membership_plan_id' => $plan->id, 'status' => 'ACTIVE',
            'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(), 'appointments_remaining' => 2]);
        $this->client(['birthdate' => now()->subYears(60)->toDateString()]);
        $this->client(['business_id' => Business::factory()->create()->id]);
        $segment = ['age_min' => 25, 'age_max' => 35, 'birthday_month' => now()->month, 'is_vip' => 'true', 'tier' => 'GOLD',
            'min_visits' => 1, 'max_visits' => 2, 'inactive_days' => 30, 'has_membership' => 'true', 'joined_after' => now()->subDay()->toDateString()];
        $query = http_build_query(['business_id' => $this->business->id, 'target_role' => 'CLIENTE', 'segment' => $segment]);
        $this->getJson('/api/campaigns/audience-preview?'.$query)->assertOk()->assertJsonPath('total_recipients', 1)
            ->assertJsonPath('recipients.0.id', $client->id)->assertJsonPath('summary.excluded', 0);
        $client->user->forceFill(['preferences' => ['email_notifications' => false]])->save();
        $this->getJson('/api/campaigns/audience-preview?'.$query)->assertOk()->assertJsonPath('total_recipients', 0)->assertJsonPath('summary.excluded', 1);
        $this->assertSame(0, CampaignLog::count());
        Mail::assertNothingSent();
    }

    public function test_crud_filters_and_related_promotions_are_scoped_and_sent_records_are_immutable(): void
    {
        $promotion = $this->promotion();
        $foreignPromotion = $this->promotion(Business::factory()->create());
        $this->postJson('/api/campaigns', $this->payload(['promotion_id' => $foreignPromotion->id]))->assertUnprocessable();
        $id = $this->postJson('/api/campaigns', $this->payload(['promotion_id' => $promotion->id, 'segment' => ['age_min' => 20]]))
            ->assertCreated()->assertJsonPath('promotion.id', $promotion->id)->json('id');
        $this->putJson('/api/campaigns/'.$id, $this->payload(['promotion_id' => null, 'subject' => 'Editada']))
            ->assertOk()->assertJsonPath('subject', 'Editada')->assertJsonPath('promotion', null);
        $this->getJson('/api/campaigns?status=DRAFT&q=editada')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/campaigns/options')->assertOk()->assertJsonCount(1, 'businesses')->assertJsonCount(1, 'promotions');
        $this->getJson('/api/campaigns/'.$id)->assertOk()->assertJsonPath('subject', 'Editada');
        $foreign = Campaign::create(array_replace($this->payload(), ['user_id' => $this->admin->id, 'business_id' => $foreignPromotion->business_id]));
        $this->getJson('/api/campaigns/'.$foreign->id)->assertForbidden();
        $this->putJson('/api/campaigns/'.$foreign->id, $this->payload())->assertForbidden();
        $this->getJson('/api/campaigns/audience-preview?business_id='.$foreignPromotion->business_id.'&target_role=CLIENTE')->assertForbidden();
        $this->postJson('/api/campaigns', $this->payload(['segment' => ['age_min' => 50, 'age_max' => 20]]))->assertUnprocessable();
        $this->deleteJson('/api/campaigns/'.$id)->assertOk();
        $sent = Campaign::create(array_replace($this->payload(), ['user_id' => $this->admin->id, 'status' => 'COMPLETED']));
        $this->putJson('/api/campaigns/'.$sent->id, $this->payload())->assertStatus(409);
        $this->deleteJson('/api/campaigns/'.$sent->id)->assertStatus(409);
        $legacy = Campaign::create(array_replace($this->payload(), ['user_id' => $this->admin->id, 'status' => 'SENDING']));
        $this->getJson('/api/campaigns?status=SENDING')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $legacy->id);
    }

    public function test_dispatch_freezes_audience_deduplicates_email_and_does_not_send_twice(): void
    {
        $client = $this->client(['email' => 'recipient@example.test']);
        $this->client(['email' => 'RECIPIENT@example.test']);
        $this->client(['email' => 'invalid-address']);
        $this->client(['business_id' => Business::factory()->create()->id]);
        $promotion = $this->promotion();
        $id = $this->postJson('/api/campaigns', $this->payload(['promotion_id' => $promotion->id]))->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk()->assertJsonPath('campaign.recipients_count', 1);
        $this->postJson('/api/campaigns/'.$id.'/send')->assertStatus(400);
        $this->client(['email' => 'late@example.test']);
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test', 'mail.from.address' => 'campaigns@example.test']);
        Mail::shouldReceive('html')->once()->withArgs(fn (string $html, \Closure $callback) => $this->validMessage($html, $callback, $client->email, $promotion->promo_code));
        $job = new ProcessCampaignJob($id);
        $job->handle(app(CampaignDeliveryService::class));
        $job->handle(app(CampaignDeliveryService::class));
        $campaign = Campaign::findOrFail($id);
        $this->assertSame('COMPLETED', $campaign->status);
        $this->assertSame(1, $campaign->sent_count);
        $this->assertSame(1, $campaign->logs()->count());
        $this->assertSame(1, Notification::where('user_id', $client->user_id)->where('data->campaign_id', $id)->count());
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('sent_success', 1)->assertJsonPath('opened', 0);
        Bus::assertDispatchedTimes(ProcessCampaignJob::class, 1);
    }

    private function validMessage(string $html, \Closure $callback, string $email, string $code): bool
    {
        $this->assertStringContainsString($code, $html);
        $this->assertStringContainsString('/campaign-events/', $html);
        $message = new Message(new Email());
        $callback($message);
        $this->assertSame($email, $message->getSymfonyMessage()->getTo()[0]->getAddress());
        $this->assertNotNull($message->getSymfonyMessage()->getHeaders()->get('List-Unsubscribe'));
        return true;
    }

    public function test_tracking_unsubscribe_and_promotion_metrics_use_real_persisted_events(): void
    {
        $client = $this->client();
        $promotion = $this->promotion();
        $appointment = $this->appointment($client);
        $campaign = Campaign::create(array_replace($this->payload(), ['user_id' => $this->admin->id, 'promotion_id' => $promotion->id,
            'status' => 'COMPLETED', 'recipients_count' => 1, 'sent_count' => 1]));
        $entry = CampaignLog::create(['campaign_id' => $campaign->id, 'recipient_id' => $client->id, 'recipient_user_id' => $client->user_id,
            'recipient_email' => $client->email, 'status' => 'SENT', 'sent_at' => now(), 'tracking_token' => (string) Str::uuid()]);
        $promotion->usages()->create(['client_id' => $client->id, 'appointment_id' => $appointment->id, 'saved_amount' => 10000]);
        $prefix = '/api/campaign-events/'.$entry->tracking_token;
        $this->get($prefix.'/open')->assertOk()->assertHeader('Content-Type', 'image/gif');
        $openedAt = $entry->fresh()->opened_at;
        $this->get($prefix.'/open')->assertOk();
        $this->assertTrue($entry->fresh()->opened_at->equalTo($openedAt));
        $this->get($prefix.'/click')->assertRedirect(rtrim(config('app.frontend_url'), '/').'/cliente/business/'.$this->business->id.'?book=1&promo_code='.$promotion->promo_code);
        $this->getJson('/api/campaigns/'.$campaign->id.'/stats')->assertOk()->assertJsonPath('sent_success', 1)
            ->assertJsonPath('opened', 1)->assertJsonPath('clicked', 1)->assertJsonPath('related_promotion.redemptions', 1)
            ->assertJsonPath('related_promotion.revenue', 40000)->assertJsonPath('related_promotion.attribution', 'promotion_total')->assertJsonCount(1, 'daily');
        $this->get($prefix.'/unsubscribe')->assertOk();
        $this->assertSame(0, DB::table('marketing.campaign_suppressions')->count());
        $this->post($prefix.'/unsubscribe')->assertOk();
        $this->post($prefix.'/unsubscribe')->assertOk();
        $this->assertSame(1, DB::table('marketing.campaign_suppressions')->count());
        $this->getJson('/api/campaigns/audience-preview?target_role=CLIENTE&business_id='.$this->business->id)->assertOk()->assertJsonPath('total_recipients', 0);
        $this->get('/api/campaign-events/'.Str::uuid().'/click')->assertNotFound();
    }

    public function test_disabled_delivery_does_not_report_sent_and_retry_ignores_uncertain_acceptance(): void
    {
        $client = $this->client();
        $id = $this->postJson('/api/campaigns', $this->payload())->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        config(['mail.default' => 'array']);
        (new ProcessCampaignJob($id))->handle(app(CampaignDeliveryService::class));
        $campaign = Campaign::findOrFail($id);
        $this->assertSame('FAILED', $campaign->status);
        $this->assertSame(0, $campaign->sent_count);
        $campaign->logs()->update(['status' => 'SENDING']);
        $this->postJson('/api/campaigns/'.$id.'/send')->assertStatus(400);
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('uncertain', 1)->assertJsonPath('sent_success', 0);
        $this->assertSame(0, Notification::where('user_id', $client->user_id)->count());
        Mail::assertNothingSent();
    }

    public function test_expired_or_disabled_promotions_are_checked_before_queue_and_before_delivery(): void
    {
        $this->client();
        $promotion = $this->promotion();
        $promotion->update(['start_date' => now()->subWeek(), 'end_date' => now(config('booking.timezone'))->subDay()->toDateString()]);
        $id = $this->postJson('/api/campaigns', $this->payload(['promotion_id' => $promotion->id]))->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertUnprocessable();
        $this->assertSame(0, CampaignLog::count());
        $promotion->update(['end_date' => now()->addWeek()]);
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        $promotion->update(['is_active' => false]);
        (new ProcessCampaignJob($id))->handle(app(CampaignDeliveryService::class));
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('sent_success', 0)->assertJsonPath('failed', 1);
        $this->assertSame('FAILED', Campaign::findOrFail($id)->status);
        Mail::assertNothingSent();
    }

    public function test_ambiguous_smtp_result_is_never_automatically_resent_or_reported_as_sent(): void
    {
        $this->client();
        $id = $this->postJson('/api/campaigns', $this->payload())->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test', 'mail.from.address' => 'campaigns@example.test']);
        Mail::shouldReceive('html')->once()->andThrow(new \RuntimeException('SMTP response interrupted'));
        (new ProcessCampaignJob($id))->handle(app(CampaignDeliveryService::class));
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('sent_success', 0)
            ->assertJsonPath('uncertain', 1)->assertJsonPath('logs.0.status', 'UNCERTAIN');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertStatus(400);
        Bus::assertDispatchedTimes(ProcessCampaignJob::class, 1);
    }

    public function test_retry_preserves_successful_recipients_and_rechecks_preferences(): void
    {
        $first = $this->client();
        $second = $this->client();
        $third = $this->client();
        $id = $this->postJson('/api/campaigns', $this->payload())->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        CampaignLog::where('campaign_id', $id)->where('recipient_id', $first->id)->update(['status' => 'OPENED', 'sent_at' => now(), 'opened_at' => now()]);
        CampaignLog::where('campaign_id', $id)->where('recipient_id', $second->id)->update(['status' => 'FAILED']);
        $third->user->forceFill(['preferences' => ['email_notifications' => false]])->save();
        Campaign::whereKey($id)->update(['status' => 'FAILED']);
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test', 'mail.from.address' => 'campaigns@example.test']);
        Mail::shouldReceive('html')->once()->andReturnNull();
        (new ProcessCampaignJob($id))->handle(app(CampaignDeliveryService::class));
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('sent_success', 2)
            ->assertJsonPath('opened', 1)->assertJsonPath('skipped', 1)->assertJsonPath('total_recipients', 3);
        $this->assertSame('COMPLETED', Campaign::findOrFail($id)->status);
        $this->assertSame(1, Notification::where('user_id', $second->user_id)->count());
        $this->assertSame(0, Notification::where('user_id', $third->user_id)->count());
    }

    public function test_promotion_is_reloaded_between_messages_of_the_same_batch(): void
    {
        $this->client();
        $this->client();
        $promotion = $this->promotion();
        $id = $this->postJson('/api/campaigns', $this->payload(['promotion_id' => $promotion->id]))->assertCreated()->json('id');
        $this->postJson('/api/campaigns/'.$id.'/send')->assertOk();
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => 'smtp.example.test', 'mail.from.address' => 'campaigns@example.test']);
        Mail::shouldReceive('html')->once()->andReturnUsing(fn () => $promotion->update(['is_active' => false]));
        (new ProcessCampaignJob($id))->handle(app(CampaignDeliveryService::class));
        $this->getJson('/api/campaigns/'.$id.'/stats')->assertOk()->assertJsonPath('sent_success', 1)->assertJsonPath('failed', 1);
        $this->assertSame('FAILED', Campaign::findOrFail($id)->status);
        $this->assertSame(1, Notification::where('data->campaign_id', $id)->count());
    }
}
