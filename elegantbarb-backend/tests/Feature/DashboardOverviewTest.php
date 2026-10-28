<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Services\DashboardOverviewService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardOverviewTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_overview_requires_authentication_and_validates_period(): void
    {
        $this->getJson('/api/dashboard/overview')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/dashboard/overview?days=367')->assertUnprocessable();
    }

    public function test_empty_overview_is_real_zeroes_without_invented_growth(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $result = app(DashboardOverviewService::class)->overview($user, 7);
        $this->assertCount(7, $result['series']);
        $this->assertSame([], $result['upcoming']);
        $this->assertSame(0.0, array_sum(array_column($result['metrics'], 'value')));
        $this->assertNull($result['metrics'][1]['change']);
    }

    public function test_admin_overview_scopes_tenants_periods_currency_and_soft_deletes(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-03 14:00:00', 'America/Bogota'));
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $other = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create(['owner_user_id' => $other->id]);
        $this->appointment($business, ['date' => '2026-10-03', 'final_price' => 25000]);
        $this->appointment($business, ['date' => '2026-09-25', 'final_price' => 10000]);
        $this->appointment($business, ['date' => '2026-10-03', 'currency' => 'USD', 'final_price' => 10]);
        $this->appointment($business, ['date' => '2026-10-04', 'final_price' => 80000]);
        $this->appointment($foreign, ['date' => '2026-10-03', 'final_price' => 90000]);
        $deleted = $this->appointment($business, ['date' => '2026-10-03', 'final_price' => 90000]);
        $deleted->delete();

        $result = app(DashboardOverviewService::class)->overview($owner, 7);
        $revenue = collect($result['metrics'])->firstWhere('id', 'revenue');
        $this->assertSame(25000.0, $revenue['value']);
        $this->assertSame(10000.0, $revenue['previous']);
        $this->assertSame(150.0, $revenue['change']);
        $this->assertSame(['COP', 'USD'], $result['currencies']);
        $this->assertSame(2, array_sum(array_column($result['series'], 'appointments')));
        $this->assertSame(25000.0, array_sum(array_column($result['series'], 'revenue')));
    }

    public function test_client_upcoming_excludes_other_clients_and_elapsed_times(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-03 14:00:00', 'America/Bogota'));
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $business = Business::factory()->create();
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        $this->appointment($business, ['client_id' => $client->id, 'date' => '2026-10-03', 'status' => 'CONFIRMED', 'start_time' => '08:00', 'end_time' => '09:00']);
        $next = $this->appointment($business, ['client_id' => $client->id, 'date' => '2026-10-03', 'status' => 'CONFIRMED', 'start_time' => '15:00', 'end_time' => '16:00']);
        $this->appointment($business, ['date' => '2026-10-04', 'status' => 'PENDING']);

        $result = app(DashboardOverviewService::class)->overview($user, 7);
        $this->assertSame([$next->id], array_column($result['upcoming'], 'id'));
        $this->assertSame('15:00', $result['upcoming'][0]['startTime']);
        $this->assertSame(1.0, $result['metrics'][0]['value']);
    }

    private function appointment(Business $business, array $attributes): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Dirección de prueba']);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);

        return Appointment::create(array_merge([
            'business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id,
            'service_id' => $service->id, 'date' => '2026-10-03', 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => 'COMPLETED', 'payment_status' => 'PAID', 'price' => 25000, 'final_price' => 25000, 'currency' => 'COP',
        ], $attributes));
    }
}
