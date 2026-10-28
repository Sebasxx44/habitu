<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Services\FeatureFlagService;
use App\Modules\Analytics\Services\OperationalDiagnostics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class MarketplaceHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_excludes_unclassified_demo_test_and_other_currencies_with_real_denominators(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(18, 0));
        $business = $this->business('PRODUCTION');
        $this->appointment($business, ['date' => '2026-10-03', 'status' => 'COMPLETED']);
        $this->appointment($business, ['date' => '2026-10-03', 'status' => 'CANCELLED']);
        $this->appointment($business, ['date' => '2026-10-03', 'source' => 'test']);
        $this->appointment($business, ['date' => '2026-10-03', 'currency' => 'USD']);
        $this->appointment($this->business('DEMO'), ['date' => '2026-10-03']);
        $this->appointment($this->business('UNCLASSIFIED'), ['date' => '2026-10-03']);
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/health?start_date=2026-10-01&end_date=2026-10-05&currency=COP')->assertOk()
            ->assertJsonPath('sample', 2)->assertJsonPath('excluded', 3)->assertJsonPath('metrics.0.numerator', 1)
            ->assertJsonPath('metrics.0.denominator', 2)->assertJsonPath('metrics.0.value', 50)->assertJsonPath('finance.collected', 0);
    }

    public function test_cohorts_use_first_completed_service_and_require_mature_follow_up(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(18, 0));
        $business = $this->business('PRODUCTION');
        foreach (range(1, 5) as $index) {
            $client = Client::factory()->create(['business_id' => $business->id]);
            $this->appointment($business, ['date' => '2026-09-01'], $client);
            if ($index < 4) $this->appointment($business, ['date' => '2026-09-15'], $client);
        }
        // A pending visit before the first completion must not establish a cohort.
        $late = Client::factory()->create(['business_id' => $business->id]);
        $this->appointment($business, ['date' => '2026-08-01', 'status' => 'PENDING'], $late);
        $this->appointment($business, ['date' => '2026-09-29'], $late);
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/health?start_date=2026-09-01&end_date=2026-09-30')->assertOk()
            ->assertJsonPath('cohorts.0.sample', 6)->assertJsonPath('cohorts.0.eligible', 5)->assertJsonPath('cohorts.0.returned', 3)->assertJsonPath('cohorts.0.rate', 60);
    }

    public function test_health_requires_ownership_and_classification_is_superadmin_only_and_audited(): void
    {
        $business = $this->business('UNCLASSIFIED');
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/analytics/health')->assertForbidden();
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        Sanctum::actingAs($owner);
        $this->getJson('/api/analytics/health?business_id='.$business->id)->assertForbidden();
        $this->putJson('/api/analytics/health/classifications/'.$business->id, ['environment' => 'PRODUCTION', 'reason' => 'Operación revisada'])->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->putJson('/api/analytics/health/classifications/'.$business->id, ['environment' => 'PRODUCTION', 'reason' => 'Operación real comprobada'])->assertOk();
        $this->assertDatabaseHas('platform.audit_logs', ['entity_id' => $business->id, 'action' => 'CLASSIFY_ANALYTICS']);
        $this->assertSame('PRODUCTION', $business->fresh()->analytics_environment);
    }

    public function test_small_filtered_groups_hide_metrics_and_customer_details(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(18, 0));
        $this->appointment($this->business('PRODUCTION'), ['date' => '2026-10-03']);
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->getJson('/api/analytics/health?days=7&hour=10')->assertOk()->assertJsonPath('suppressed', true)
            ->assertJsonPath('metrics', [])->assertJsonPath('finance', null)->assertJsonMissingPath('clients');
    }

    public function test_feature_switches_are_superadmin_only_scoped_audited_and_global_disable_wins(): void
    {
        $business = $this->business('UNCLASSIFIED');
        $flags = app(FeatureFlagService::class);
        $flags->enable('routines');
        $change = ['scope' => 'business', 'scope_id' => $business->id, 'enabled' => false, 'reason' => 'Pausa de piloto comprobada'];
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/analytics/health/features?scope=global')->assertForbidden();
        $this->putJson('/api/analytics/health/features/routines', $change)->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->putJson('/api/analytics/health/features/arbitrary', $change)->assertNotFound();
        $this->putJson('/api/analytics/health/features/routines', $change)->assertOk();
        $this->assertFalse($flags->isEnabled('routines', 2, $business->id));
        $this->assertTrue($flags->isEnabled('routines', 2, $business->id + 9999));
        $this->getJson('/api/analytics/health/features?scope=business&scope_id='.$business->id)->assertOk()->assertJsonFragment(['name' => 'routines', 'enabled' => true, 'user_percentage' => 100, 'override' => false]);
        $categoryId = DB::table('platform.business_categories')->insertGetId(['name' => 'Prueba de activación', 'slug' => 'flag-control-test', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->putJson('/api/analytics/health/features/routines', array_replace($change, ['scope' => 'category', 'scope_id' => $categoryId]))->assertOk();
        $this->putJson('/api/analytics/health/features/routines', array_replace($change, ['enabled' => true]))->assertOk();
        $this->assertTrue($flags->isEnabled('routines', 2, $business->id, $categoryId));
        $this->putJson('/api/analytics/health/features/routines', array_replace($change, ['enabled' => null]))->assertOk();
        $this->assertFalse($flags->isEnabled('routines', 2, $business->id, $categoryId));
        $this->putJson('/api/analytics/health/features/routines', ['scope' => 'global', 'enabled' => false, 'user_percentage' => 100, 'reason' => 'Interrupción global comprobada'])->assertOk();
        $this->assertFalse($flags->isEnabled('routines', 2));
        $this->putJson('/api/analytics/health/features/routines', array_replace($change, ['enabled' => true]))->assertOk();
        $this->assertFalse($flags->isEnabled('routines', 2, $business->id, $categoryId));
        $this->putJson('/api/analytics/health/features/routines', ['scope' => 'global', 'enabled' => true, 'user_percentage' => 20, 'reason' => 'Despliegue gradual verificado'])->assertOk();
        $this->assertTrue($flags->isEnabled('routines', 19));
        $this->assertFalse($flags->isEnabled('routines', 20));
        $this->assertDatabaseHas('platform.audit_logs', ['action' => 'CHANGE_FEATURE_FLAG', 'business_id' => $business->id, 'reason' => $change['reason']]);
        $this->assertSame(7, DB::table('platform.audit_logs')->where('action', 'CHANGE_FEATURE_FLAG')->count());
    }

    public function test_operational_diagnostics_require_superadmin_and_never_reveal_secrets_or_claim_missing_evidence(): void
    {
        config(['services.wompi.private_key' => 'sensitive-provider-value', 'mail.default' => 'log', 'queue.default' => 'sync']);
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/analytics/health/operations')->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $response = $this->getJson('/api/analytics/health/operations')->assertOk()->assertJsonPath('signals.0.status', 'NO_EVIDENCE')
            ->assertJsonPath('signals.0.stale', null)->assertJsonPath('queue.pending', null)->assertJsonPath('providers.0.configured', false);
        $this->assertStringNotContainsString('sensitive-provider-value', $response->getContent());
        $diagnostics = app(OperationalDiagnostics::class);
        $this->assertSame(9, $diagnostics->run('outbox', fn () => 9));
        $diagnostics->record('scheduler');
        try { $diagnostics->run('payments', fn () => throw new \RuntimeException('sensitive-failure-payload')); }
        catch (\RuntimeException $exception) { $this->assertSame('sensitive-failure-payload', $exception->getMessage()); }
        $this->travel(4)->minutes();
        $response = $this->getJson('/api/analytics/health/operations')->assertOk()->assertJsonPath('signals.0.stale', true)
            ->assertJsonPath('signals.1.status', 'SUCCEEDED')->assertJsonPath('signals.2.status', 'FAILED');
        $this->assertStringNotContainsString('sensitive-failure-payload', $response->getContent());
        $this->assertDatabaseHas('platform.operational_heartbeats', ['name' => 'outbox', 'status' => 'SUCCEEDED']);
    }

    private function business(string $environment): Business
    {
        $business = Business::factory()->create();
        $business->forceFill(['analytics_environment' => $environment])->save();
        return $business;
    }

    private function appointment(Business $business, array $overrides, ?Client $client = null): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id]);
        $client ??= Client::factory()->create(['business_id' => $business->id]);
        return Appointment::create(array_replace(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => $client->id, 'date' => '2026-10-03', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'COMPLETED', 'price' => 10000, 'final_price' => 10000,
            'currency' => 'COP', 'booking_model' => 'direct', 'source' => 'app'], $overrides));
    }
}
