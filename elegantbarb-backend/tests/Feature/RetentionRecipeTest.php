<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Services\RetentionRecipeService;
use App\Modules\Marketing\Services\RetentionAttributionService;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\BusinessCategory;
use App\Modules\Subscriptions\Models\ClientMembership;
use App\Modules\Subscriptions\Models\MembershipPlan;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RetentionRecipeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
        Http::preventStrayRequests();
        config(['push.enabled' => false]);
    }

    public function test_return_proposals_deduplicate_and_revalidate_opt_out_without_sending(): void
    {
        [$owner, $business, $user, $client, $service] = $this->fixture();
        $this->appointment($business, $client, $service, 'COMPLETED', now()->subDays(40)->toDateString());
        $this->recipe($business, 'RETURN_REMINDER');
        $recipes = app(RetentionRecipeService::class);
        $this->assertSame(0, $recipes->scan($business));
        $this->preference($user, true);
        $this->assertSame(1, $recipes->scan($business));
        $this->assertSame(0, $recipes->scan($business));
        $this->assertSame(0, DB::table('marketing.notifications')->count());
        $action = DB::table('marketing.retention_actions')->first();
        $this->preference($user, false);
        Sanctum::actingAs($owner);
        $this->postJson($this->approveUrl($business, $action->id))->assertOk()->assertJsonPath('data.state', 'SUPPRESSED');
        $this->assertSame(0, DB::table('marketing.notifications')->count());
        Http::assertNothingSent();
    }

    public function test_approval_is_owned_obeys_contact_window_and_expires(): void
    {
        [$owner, $business, $user] = $this->fixture();
        $recipe = $this->recipe($business, 'RETURN_REMINDER');
        $action = $this->proposal($recipe, $user);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->getJson('/api/v2/retention/'.$business->id)->assertForbidden();
        $this->postJson($this->approveUrl($business, $action))->assertForbidden();
        Sanctum::actingAs($user);
        $this->postJson($this->approveUrl($business, $action))->assertForbidden();
        Sanctum::actingAs($owner);
        $this->preference($user, true, '11:00', '12:00');
        $this->postJson($this->approveUrl($business, $action))->assertConflict();
        $this->assertDatabaseHas('marketing.retention_actions', ['id' => $action, 'state' => 'PROPOSED', 'approved_at' => null]);
        $this->preference($user, true);
        DB::table('marketing.retention_actions')->where('id', $action)->update(['expires_at' => now()->subMinute()]);
        $this->postJson($this->approveUrl($business, $action))->assertConflict();
        $this->assertSame(0, DB::table('marketing.notifications')->count());
    }

    public function test_notification_is_idempotent_frequency_limited_and_suppressed_by_new_booking(): void
    {
        [$owner, $business, $user, $client, $service] = $this->fixture();
        $recipe = $this->recipe($business, 'RETURN_REMINDER');
        $this->preference($user, true);
        $first = $this->proposal($recipe, $user);
        $second = $this->proposal($recipe, $user);
        Sanctum::actingAs($owner);
        $this->postJson($this->approveUrl($business, $first))->assertOk()->assertJsonPath('data.state', 'NOTIFIED_IN_APP');
        $this->postJson($this->approveUrl($business, $first))->assertOk()->assertJsonPath('data.state', 'NOTIFIED_IN_APP');
        $this->postJson($this->approveUrl($business, $second))->assertOk()->assertJsonPath('data.state', 'SUPPRESSED');
        $this->assertSame(1, DB::table('marketing.notifications')->count());
        $this->assertDatabaseHas('marketing.notifications', ['user_id' => $user->id, 'type' => 'RETURN_REMINDER']);
        DB::table('marketing.retention_actions')->where('id', $first)->update(['approved_at' => now()->subDays(31)]);
        $this->appointment($business, $client, $service, 'CONFIRMED', now()->addDay()->toDateString());
        $third = $this->proposal($recipe, $user);
        $this->postJson($this->approveUrl($business, $third))->assertOk()->assertJsonPath('data.state', 'SUPPRESSED');
        $this->assertSame(1, DB::table('marketing.notifications')->count());
        Http::assertNothingSent();
    }

    public function test_membership_proposal_is_suppressed_if_membership_was_renewed(): void
    {
        [$owner, $business, , $client] = $this->fixture();
        $plan = MembershipPlan::create(['business_id' => $business->id, 'name' => 'Rutina', 'slug' => Str::uuid(), 'price' => 30000,
            'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'appointments_included' => 1, 'included_services' => [], 'benefits' => [], 'is_active' => true]);
        $membership = ClientMembership::create(['client_id' => $client->id, 'membership_plan_id' => $plan->id, 'status' => 'ACTIVE',
            'starts_at' => now()->subMonth(), 'ends_at' => now()->addDays(3), 'appointments_remaining' => 1, 'appointments_used' => 0]);
        $this->recipe($business, 'MEMBERSHIP_EXPIRING');
        $recipes = app(RetentionRecipeService::class);
        $this->assertSame(1, $recipes->scan($business));
        $this->assertSame(0, $recipes->scan($business));
        $action = DB::table('marketing.retention_actions')->first();
        $membership->update(['ends_at' => now()->addMonth()]);
        Sanctum::actingAs($owner);
        $this->postJson($this->approveUrl($business, $action->id))->assertOk()->assertJsonPath('data.state', 'SUPPRESSED');
        $this->assertSame(0, DB::table('marketing.notifications')->count());
    }

    public function test_clinical_marketing_is_excluded_and_discount_and_availability_are_revalidated(): void
    {
        [$owner, $business, $user, $client, $service] = $this->fixture();
        $category = BusinessCategory::create(['name' => 'Clínica dental', 'slug' => 'clinica-dental', 'is_active' => true]);
        $business->update(['business_category_id' => $category->id]);
        $this->appointment($business, $client, $service, 'COMPLETED', now()->subDays(40)->toDateString());
        $this->preference($user, true);
        $this->recipe($business, 'RETURN_REMINDER');
        $recipe = $this->recipe($business, 'OPEN_SLOTS_PROMOTION');
        $this->assertSame(0, app(RetentionRecipeService::class)->scan($business));
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Centro', 'address' => 'Calle de prueba', 'is_active' => true]);
        $action = $this->proposal($recipe, null, ['title' => $service->name, 'service_id' => $service->id, 'branch_id' => $branch->id, 'date' => now()->addDay()->toDateString()]);
        Sanctum::actingAs($owner);
        $this->postJson($this->approveUrl($business, $action), ['discount' => 10])->assertUnprocessable();
        $business->update(['business_category_id' => BusinessCategory::where('slug', 'barberia')->value('id')]);
        $this->postJson($this->approveUrl($business, $action), ['discount' => 30])->assertUnprocessable();
        $this->postJson($this->approveUrl($business, $action), ['discount' => 10])->assertConflict();
        $this->assertSame(0, DB::table('marketing.promotions')->count());
    }

    private function fixture(): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $user = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $client = Client::factory()->create(['business_id' => $business->id, 'user_id' => $user->id]);
        $service = Service::factory()->create(['business_id' => $business->id, 'is_active' => true, 'duration_minutes' => 30]);
        return [$owner, $business, $user, $client, $service];
    }

    public function test_attribution_requires_measurement_consent_owner_click_and_seven_day_window(): void
    {
        config(['analytics.enabled' => true]);
        [$owner, $business, $user, $client, $service] = $this->fixture();
        $recipe = $this->recipe($business, 'RETURN_REMINDER');
        $action = $this->proposal($recipe, $user);
        $this->preference($user, true);
        Sanctum::actingAs($owner);
        $this->postJson($this->approveUrl($business, $action))->assertOk();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CLIENT]));
        $this->postJson('/api/v2/retention-actions/'.$action.'/click')->assertNotFound();
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/retention-actions/'.$action.'/click')->assertOk();
        $this->assertDatabaseHas('marketing.retention_actions', ['id' => $action, 'clicked_at' => null]);
        DB::table('platform.analytics_preferences')->insert(['user_id' => $user->id, 'measurement' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson('/api/v2/retention-actions/'.$action.'/click')->assertOk();
        $clickedAt = DB::table('marketing.retention_actions')->where('id', $action)->value('clicked_at');
        $this->travel(1)->hours();
        $this->postJson('/api/v2/retention-actions/'.$action.'/click')->assertOk();
        $this->assertSame($clickedAt, DB::table('marketing.retention_actions')->where('id', $action)->value('clicked_at'));
        $appointment = $this->appointment($business, $client, $service, 'CONFIRMED', now()->addDay()->toDateString());
        $attribution = app(RetentionAttributionService::class);
        $attribution->attribute($appointment); $attribution->attribute($appointment);
        $this->assertSame(1, DB::table('marketing.retention_attributions')->count());
        $this->assertSame(0, $attribution->completions($action));
        $appointment->update(['status' => 'COMPLETED']);
        $this->assertSame(1, $attribution->completions($action));
        $this->travel(8)->days();
        $expired = $this->appointment($business, $client, $service, 'CONFIRMED', now()->addDay()->toDateString());
        $attribution->attribute($expired);
        $this->assertSame(1, DB::table('marketing.retention_attributions')->count());
    }

    private function recipe(Business $business, string $kind): int
    {
        return DB::table('marketing.retention_recipes')->insertGetId(['business_id' => $business->id, 'kind' => $kind, 'enabled' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function proposal(int $recipe, ?User $user, array $payload = []): int
    {
        return DB::table('marketing.retention_actions')->insertGetId(['recipe_id' => $recipe, 'user_id' => $user?->id,
            'dedupe_key' => Str::uuid(), 'payload' => json_encode($payload ?: ['title' => 'Regresa', 'message' => 'Consulta horarios.', 'url' => '/cliente']),
            'state' => 'PROPOSED', 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
    }

    private function preference(User $user, bool $enabled, string $start = '09:00', string $end = '20:00'): void
    {
        DB::table('marketing.contact_preferences')->updateOrInsert(['user_id' => $user->id], ['promotions_enabled' => $enabled,
            'timezone' => 'America/Bogota', 'contact_start' => $start, 'contact_end' => $end, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function appointment(Business $business, Client $client, Service $service, string $status, string $date): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Centro', 'address' => 'Calle de prueba', 'is_active' => true]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id, 'service_id' => $service->id,
            'booking_code' => Str::random(12), 'date' => $date, 'start_time' => '10:00', 'end_time' => '10:30', 'status' => $status, 'price' => 30000, 'final_price' => 30000]);
    }

    private function approveUrl(Business $business, int $action): string
    {
        return '/api/v2/retention/'.$business->id.'/actions/'.$action.'/approve';
    }
}
