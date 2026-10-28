<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_requires_role_and_validates_bounded_period(): void
    {
        $this->getJson('/api/reports/detailed')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/reports/detailed')->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/reports/detailed?start_date=2025-01-01&end_date=2026-10-03')->assertUnprocessable();
        $this->getJson('/api/reports/detailed?start_date=2026-10-03&end_date=2026-10-01')->assertUnprocessable();
        $this->getJson('/api/reports/detailed?currency=invalid')->assertUnprocessable();
    }

    public function test_report_scopes_owned_business_and_separates_currency_actual_payments_and_client_cohorts(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create();
        $client = Client::factory()->create(['business_id' => $business->id]);
        $this->appointment($business, ['client_id' => $client->id, 'date' => '2026-09-28']);
        $paid = $this->appointment($business, ['client_id' => $client->id, 'price' => 120, 'discount_amount' => 20, 'final_price' => 100]);
        $pending = $this->appointment($business, ['status' => 'PENDING', 'final_price' => 70]);
        $this->appointment($business, ['currency' => 'USD', 'final_price' => 8]);
        $this->appointment($foreign, ['final_price' => 999]);
        $deleted = $this->appointment($business, ['final_price' => 888]);
        $deleted->delete();
        DB::table('finance.payments')->insert([
            ['appointment_id' => $paid->id, 'business_id' => $business->id, 'client_id' => $client->id, 'amount' => 40, 'currency' => 'COP', 'method' => 'CARD', 'status' => 'COMPLETED'],
            ['appointment_id' => $paid->id, 'business_id' => $business->id, 'client_id' => $client->id, 'amount' => 60, 'currency' => 'COP', 'method' => 'CASH', 'status' => 'PENDING'],
        ]);
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/reports/detailed?start_date=2026-10-01&end_date=2026-10-03');
        $response->assertOk()->assertJsonPath('summary.totalRevenue', 100)
            ->assertJsonPath('summary.completedAppointments', 1)->assertJsonPath('summary.totalAppointments', 2)
            ->assertJsonPath('summary.totalClients', 2)->assertJsonPath('summary.newClients', 1)
            ->assertJsonPath('summary.returningClients', 1)->assertJsonPath('currencies', ['COP', 'USD']);
        $records = collect($response->json('records'));
        $this->assertSame(40, $records->firstWhere('id', $paid->id)['total_pagado']);
        $this->assertSame(20, $records->firstWhere('id', $paid->id)['descuento']);
        $this->assertSame('Sin pago registrado', $records->firstWhere('id', $pending->id)['metodo_pago']);
        $this->assertNull($records->first()['comision_barbero']);
        $this->assertNull($records->first()['ganancia_neta']);
        $this->assertNotEmpty($response->json('topServices.0.name'));
        $this->getJson('/api/reports/detailed?start_date=2026-10-01&end_date=2026-10-03&currency=USD')
            ->assertOk()->assertJsonPath('summary.totalRevenue', 8)->assertJsonPath('summary.totalAppointments', 1);
    }

    public function test_report_and_html_export_reject_foreign_business_and_escape_customer_data(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create();
        $client = Client::factory()->create(['business_id' => $business->id, 'name' => '<script>alert(1)</script>']);
        $this->appointment($business, ['client_id' => $client->id]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/reports/detailed?business_id='.$foreign->id)->assertForbidden();
        $this->getJson('/api/v2/dashboard/bi/pdf?business_id='.$foreign->id)->assertForbidden();
        $response = $this->get('/api/v2/dashboard/bi/pdf?start_date=2026-10-01&end_date=2026-10-03');
        $response->assertOk();
        $this->assertStringNotContainsString('<script>', $response->getContent());
        $this->assertStringContainsString('&lt;script&gt;', $response->getContent());
    }

    public function test_admin_without_business_has_real_empty_report(): void
    {
        $this->appointment(Business::factory()->create());
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/reports/detailed?start_date=2026-10-01&end_date=2026-10-03')
            ->assertOk()->assertJsonPath('summary.totalRevenue', 0)->assertJsonPath('summary.newClients', 0)
            ->assertJsonPath('summary.totalClients', 0)->assertJsonPath('records', []);
    }

    public function test_daily_trend_includes_empty_days_and_both_boundaries_without_crossing_scope_or_currency(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $this->appointment($business, ['date' => '2026-10-01', 'final_price' => 100]);
        $this->appointment($business, ['date' => '2026-10-03', 'final_price' => 200]);
        $this->appointment($business, ['date' => '2026-10-02', 'currency' => 'USD', 'final_price' => 99]);
        $this->appointment(Business::factory()->create(), ['date' => '2026-10-02', 'final_price' => 999]);
        $this->appointment($business, ['date' => '2026-09-30', 'final_price' => 800]);
        $this->appointment($business, ['date' => '2026-10-04', 'final_price' => 700]);
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/reports/detailed?start_date=2026-10-01&end_date=2026-10-03&currency=COP')->assertOk();
        $this->assertSame([
            ['date' => '2026-10-01', 'count' => 1, 'revenue' => 100],
            ['date' => '2026-10-02', 'count' => 0, 'revenue' => 0],
            ['date' => '2026-10-03', 'count' => 1, 'revenue' => 200],
        ], $response->json('dailyTrend'));
        $response->assertJsonPath('summary.totalRevenue', 300)->assertJsonCount(2, 'records')
            ->assertJsonPath('records.0.comision_barbero', null)->assertJsonPath('records.0.ganancia_neta', null);
        $this->getJson('/api/reports/detailed?start_date=2026-10-02&end_date=2026-10-02&currency=COP')->assertOk()
            ->assertJsonCount(1, 'dailyTrend')->assertJsonPath('dailyTrend.0.date', '2026-10-02')
            ->assertJsonPath('dailyTrend.0.count', 0)->assertJsonPath('dailyTrend.0.revenue', 0);
    }

    private function appointment(Business $business, array $attributes = []): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Prueba']);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);
        return Appointment::create(array_merge([
            'business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id, 'service_id' => $service->id,
            'date' => '2026-10-03', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'COMPLETED',
            'payment_status' => 'PENDING', 'price' => 100, 'final_price' => 100, 'currency' => 'COP',
        ], $attributes));
    }
}
