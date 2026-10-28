<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Services\RetentionAttributionService;
use App\Modules\People\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RetentionAttributionTest extends TestCase
{
    use RefreshDatabase;
    private User $user;
    private Business $business;
    private Appointment $appointment;
    private int $actionId;

    protected function setUp(): void
    {
        parent::setUp();
        config(['analytics.enabled' => true]);
        $this->user = User::factory()->create(['role' => 'CLIENTE']);
        $this->business = Business::factory()->create();
        $client = Client::factory()->create(['user_id' => $this->user->id, 'business_id' => $this->business->id]);
        $branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede pruebas', 'address' => 'Zona de prueba', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        $this->appointment = Appointment::create(['business_id' => $this->business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => $client->id,
            'date' => now()->addDay()->toDateString(), 'start_time' => '12:00', 'end_time' => '13:00', 'price' => 10000, 'final_price' => 10000, 'duration_minutes' => 60,
            'status' => 'CONFIRMED', 'payment_status' => 'PENDING', 'booking_model' => 'direct', 'participants' => 1, 'source' => 'WEB']);
        $recipeId = DB::table('marketing.retention_recipes')->insertGetId(['business_id' => $this->business->id, 'kind' => 'RETURN_REMINDER', 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->actionId = DB::table('marketing.retention_actions')->insertGetId(['recipe_id' => $recipeId, 'user_id' => $this->user->id, 'dedupe_key' => 'attribution-test',
            'state' => 'NOTIFIED_IN_APP', 'payload' => '{}', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($this->user);
    }

    public function test_click_requires_owner_and_measurement_consent_and_does_not_reset_attribution_window(): void
    {
        $this->postJson('/api/v2/retention-actions/'.$this->actionId.'/click')->assertOk();
        $this->assertNull(DB::table('marketing.retention_actions')->where('id', $this->actionId)->value('clicked_at'));
        $this->consent();
        $this->postJson('/api/v2/retention-actions/'.$this->actionId.'/click')->assertOk();
        $clicked = DB::table('marketing.retention_actions')->where('id', $this->actionId)->value('clicked_at');
        $this->travel(1)->day();
        $this->postJson('/api/v2/retention-actions/'.$this->actionId.'/click')->assertOk();
        $this->assertSame($clicked, DB::table('marketing.retention_actions')->where('id', $this->actionId)->value('clicked_at'));
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/retention-actions/'.$this->actionId.'/click')->assertNotFound();
    }

    public function test_attribution_is_unique_and_counts_only_completed_non_demo_bookings(): void
    {
        $this->consent();
        $attribution = app(RetentionAttributionService::class);
        $attribution->attribute($this->appointment);
        $this->assertDatabaseCount('marketing.retention_attributions', 0);
        $this->postJson('/api/v2/retention-actions/'.$this->actionId.'/click')->assertOk();
        $attribution->attribute($this->appointment);
        $attribution->attribute($this->appointment);
        $this->assertDatabaseCount('marketing.retention_attributions', 1);
        $this->assertSame(0, $attribution->completions($this->actionId));
        $this->appointment->update(['status' => 'COMPLETED']);
        $this->assertSame(1, $attribution->completions($this->actionId));
        $this->appointment->update(['source' => 'DEMO']);
        $this->assertSame(0, $attribution->completions($this->actionId));
    }

    public function test_expired_window_foreign_business_and_revoked_consent_cannot_attribute(): void
    {
        $this->consent();
        DB::table('marketing.retention_actions')->where('id', $this->actionId)->update(['clicked_at' => now()->subDays(8)]);
        $attribution = app(RetentionAttributionService::class);
        $attribution->attribute($this->appointment);
        $this->assertDatabaseCount('marketing.retention_attributions', 0);
        DB::table('marketing.retention_actions')->where('id', $this->actionId)->update(['clicked_at' => now()]);
        DB::table('platform.analytics_preferences')->where('user_id', $this->user->id)->update(['measurement' => false]);
        $attribution->attribute($this->appointment);
        $this->assertDatabaseCount('marketing.retention_attributions', 0);
        $this->consent();
        $foreign = $this->appointment->replicate(); $foreign->business_id = Business::factory()->create()->id;
        $attribution->attribute($foreign);
        $this->assertDatabaseCount('marketing.retention_attributions', 0);
    }

    public function test_forgetting_measurement_keeps_operational_notice_but_removes_click_and_attribution(): void
    {
        $this->consent();
        $service = app(RetentionAttributionService::class);
        $service->click($this->user, $this->actionId);
        $service->attribute($this->appointment);
        $this->assertDatabaseCount('marketing.retention_attributions', 1);
        $service->forget($this->user->id);
        $this->assertDatabaseCount('marketing.retention_attributions', 0);
        $this->assertDatabaseHas('marketing.retention_actions', ['id' => $this->actionId, 'state' => 'NOTIFIED_IN_APP', 'clicked_at' => null]);
    }

    private function consent(): void
    {
        DB::table('platform.analytics_preferences')->updateOrInsert(['user_id' => $this->user->id], ['measurement' => true, 'created_at' => now(), 'updated_at' => now()]);
    }
}
