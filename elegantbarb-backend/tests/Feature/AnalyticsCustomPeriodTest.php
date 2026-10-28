<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AnalyticsCustomPeriodTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_custom_range_is_inclusive_and_keeps_current_operations(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $this->appointment($business, ['date' => '2026-09-01', 'final_price' => 10]);
        $this->appointment($business, ['final_price' => 20]);
        $this->appointment($business, ['date' => '2026-08-31', 'final_price' => 5]);
        $this->appointment($business, ['date' => '2026-10-04']);
        $next = $this->appointment($business, ['date' => '2026-10-05', 'status' => 'CONFIRMED']);
        $this->appointment($business, ['date' => '2026-09-03', 'status' => 'CONFIRMED']);
        $this->appointment(Business::factory()->create(), ['final_price' => 999]);
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/dashboard/overview?start_date=2026-09-01&end_date=2026-09-02')->assertOk()
            ->assertJsonPath('period.days', 2)->assertJsonPath('period.previousStart', '2026-08-30')
            ->assertJsonCount(2, 'series')->assertJsonPath('series.0.revenue', 10)->assertJsonPath('series.1.revenue', 20)
            ->assertJsonCount(1, 'upcoming')->assertJsonPath('upcoming.0.id', $next->id);
        $metrics = collect($response->json('metrics'))->keyBy('id');
        $this->assertEquals(30, $metrics['revenue']['value']);
        $this->assertEquals(5, $metrics['revenue']['previous']);
        $this->assertEquals(1, $metrics['today']['value']);
        foreach (['start_date=2026-09-01', 'start_date=2026-09-02&end_date=2026-09-01', 'start_date=2025-01-01&end_date=2026-10-04', 'start_date=2026-10-05&end_date=2026-10-05'] as $query) {
            $this->getJson('/api/dashboard/overview?'.$query)->assertUnprocessable();
        }
        $this->getJson('/api/dashboard/overview?days=365')->assertOk()->assertJsonCount(365, 'series');
    }

    public function test_dashboard_range_is_scoped_for_each_profile(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $business = Business::factory()->create();
        $professionalUser = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['business_id' => $business->id, 'user_id' => $professionalUser->id, 'name' => 'Profesional']);
        $clientUser = User::factory()->create(['role' => User::ROLE_CLIENT]);
        $client = Client::factory()->create(['business_id' => $business->id, 'user_id' => $clientUser->id]);
        $this->appointment($business, ['professional_id' => $professional->id, 'client_id' => $client->id]);
        $this->appointment($business);
        foreach ([$professionalUser, $clientUser] as $user) {
            Sanctum::actingAs($user);
            $this->getJson('/api/dashboard/overview?start_date=2026-09-02&end_date=2026-09-02')->assertOk()
                ->assertJsonPath('series.0.appointments', 1)->assertJsonPath('period.days', 1);
        }
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $this->getJson('/api/dashboard/overview?start_date=2026-09-02&end_date=2026-09-02')->assertOk()->assertJsonPath('series.0.appointments', 2);
    }

    public function test_branch_chart_aggregates_every_branch_before_pagination(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        foreach (range(1, 14) as $index) $this->appointment($business, ['final_price' => 10]);
        $this->appointment($business, ['date' => '2026-10-01', 'final_price' => 999]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/branches?analytics=1&start_date=2026-09-02&end_date=2026-09-02')->assertOk()
            ->assertJsonCount(12, 'data.data')->assertJsonCount(15, 'data.analytics')
            ->assertJsonPath('data.summary.revenue', 140)->assertJsonPath('data.summary.days', 1);
        $this->getJson('/api/v2/branches?analytics=1&start_date=2026-09-02')->assertUnprocessable();
    }

    public function test_earnings_use_bogota_boundaries_wallet_scope_and_service_date(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $business = Business::factory()->create();
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['business_id' => $business->id, 'user_id' => $user->id, 'name' => 'Profesional']);
        $wallet = DB::table('finance.wallets')->insertGetId(['user_id' => $user->id, 'balance' => 100]);
        foreach ([['2026-09-02 04:59:59', 900, 'COMPLETED'], ['2026-09-02 05:00:00', 20, 'COMPLETED'], ['2026-09-03 04:59:59', 30, 'COMPLETED'], ['2026-09-03 05:00:00', 800, 'COMPLETED'], ['2026-09-02 12:00:00', 700, 'PENDING']] as [$date, $amount, $status]) {
            DB::table('finance.wallet_transactions')->insert(['wallet_id' => $wallet, 'user_id' => $user->id, 'type' => 'PAYOUT', 'amount' => $amount,
                'status' => $status, 'balance_before' => 0, 'balance_after' => $amount, 'created_at' => $date]);
        }
        $this->appointment($business, ['professional_id' => $professional->id]);
        $this->appointment($business, ['date' => '2026-09-01', 'professional_id' => $professional->id]);
        $this->appointment($business);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/earnings/dashboard?start_date=2026-09-02&end_date=2026-09-02')->assertOk()
            ->assertJsonPath('data.period_earnings', 50)->assertJsonPath('data.period_completed_services', 1)
            ->assertJsonPath('data.period_rating', null)->assertJsonPath('data.series.0.earnings', 50)
            ->assertJsonPath('data.series.0.completed_services', 1)->assertJsonCount(3, 'data.recent_transactions');
        $this->getJson('/api/v2/earnings/dashboard?days=367')->assertUnprocessable();
    }

    public function test_home_service_analytics_include_more_than_100_requests_and_exclude_other_tenants(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create();
        $client = Client::factory()->create(['business_id' => $business->id]);
        foreach (range(1, 102) as $index) DB::table('on_demand.requests')->insert([
            'client_id' => $client->id, 'business_id' => $business->id, 'request_code' => 'AN-'.$index,
            'status' => 'COMPLETED', 'final_price' => 10, 'currency' => 'COP',
            'created_at' => '2026-09-03 04:00:00', 'completed_at' => '2026-09-03 04:30:00', 'accepted_at' => '2026-09-03 04:05:00',
        ]);
        foreach ([['AN-before', $business->id, '2026-09-02 04:59:59'], ['AN-after', $business->id, '2026-09-03 05:00:00'], ['AN-foreign', $foreign->id, '2026-09-02 12:00:00']] as [$code, $id, $date]) {
            DB::table('on_demand.requests')->insert(['client_id' => $client->id, 'business_id' => $id, 'request_code' => $code, 'status' => 'CANCELLED', 'created_at' => $date]);
        }
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/on-demand/analytics?start_date=2026-09-02&end_date=2026-09-02')->assertOk()
            ->assertJsonPath('data.completed', 102)->assertJsonPath('data.finalRevenue.0.amount', 1020)
            ->assertJsonPath('data.averageAcceptanceMinutes', 5)->assertJsonPath('data.daily.0.created', 102)
            ->assertJsonPath('data.daily.0.completed', 102)->assertJsonPath('data.completionRate', 100);
        $this->getJson('/api/v2/on-demand/analytics?business_id='.$foreign->id)->assertForbidden();
    }

    public function test_professional_detail_separates_currency_and_scopes_clients(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 4)->setTime(18, 0));
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $professional = Professional::create(['business_id' => $business->id, 'name' => 'Profesional']);
        $this->appointment($business, ['professional_id' => $professional->id, 'final_price' => 5000]);
        $this->appointment($business, ['professional_id' => $professional->id, 'currency' => 'USD', 'final_price' => 10]);
        $this->appointment($business);
        Sanctum::actingAs($owner);
        $this->getJson('/api/dashboard/barbero?barber_id='.$professional->id.'&start_date=2026-09-02&end_date=2026-09-02&currency=USD')->assertOk()
            ->assertJsonPath('currency', 'USD')->assertJsonPath('stats.monthRevenue', 10)->assertJsonPath('dailyIncome.0.income', '10.00')
            ->assertJsonCount(2, 'myClients');
        $this->getJson('/api/dashboard/barbero?start_date=2026-09-02')->assertUnprocessable();
    }

    private function appointment(Business $business, array $attributes = []): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Calle 1']);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);
        return Appointment::create(array_merge(['business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id,
            'service_id' => $service->id, 'date' => '2026-09-02', 'start_time' => '10:00', 'end_time' => '11:00',
            'status' => 'COMPLETED', 'payment_status' => 'PAID', 'price' => 100, 'final_price' => 100, 'currency' => 'COP'], $attributes));
    }
}
