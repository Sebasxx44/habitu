<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_branch_analytics_are_private_and_scoped_to_owner_with_zeroes_for_empty_branches(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Centro', 'address' => 'Calle 1', 'is_active' => true]);
        $foreign = BusinessBranch::create(['business_id' => Business::factory()->create()->id, 'name' => 'Ajena', 'address' => 'Calle 2']);
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CLIENT]));
        $this->getJson('/api/v2/branches?analytics=1')->assertForbidden();
        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/v2/branches?analytics=1')->assertOk();
        $response->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.id', $branch->id)
            ->assertJsonPath('data.data.0.metrics.appointments', 0)->assertJsonPath('data.data.0.metrics.averageTicket', null)
            ->assertJsonPath('data.summary.active', 1);
        $this->getJson('/api/v2/branches?business_id='.$foreign->business_id.'&analytics=1')->assertForbidden();
        $this->getJson('/api/v2/branches?business_id='.$business->id)->assertOk()->assertJsonMissingPath('data.data.0.metrics');
    }

    public function test_branch_metrics_respect_dates_status_currency_soft_deletes_and_pending_visits(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-10-03 14:00:00', 'America/Bogota'));
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Norte', 'address' => 'Calle 1']);
        $client = Client::factory()->create(['business_id' => $business->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);
        $make = fn (array $data = []) => Appointment::create(array_merge([
            'business_id' => $business->id, 'branch_id' => $branch->id, 'client_id' => $client->id, 'service_id' => $service->id,
            'date' => '2026-10-03', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'COMPLETED',
            'price' => 30000, 'final_price' => 30000, 'currency' => 'COP',
        ], $data));
        $make(); $make(['final_price' => 10, 'currency' => 'USD']);
        $make(['status' => 'CANCELLED']); $make(['status' => 'NO_SHOW']);
        $make(['date' => '2026-10-04', 'status' => 'CONFIRMED']);
        $make(['date' => '2026-09-01']); $make()->delete();
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/branches?analytics=1&days=7&currency=COP')->assertOk()
            ->assertJsonPath('data.data.0.metrics.appointments', 4)
            ->assertJsonPath('data.data.0.metrics.completed', 2)
            ->assertJsonPath('data.data.0.metrics.revenue', 30000)
            ->assertJsonPath('data.data.0.metrics.averageTicket', 30000)
            ->assertJsonPath('data.data.0.metrics.clients', 1)
            ->assertJsonPath('data.data.0.metrics.upcoming', 1);
    }

    public function test_schedules_save_atomically_and_reject_invalid_time_and_duplicate_days(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        Sanctum::actingAs($owner);
        $schedules = array_map(fn (int $day) => ['day' => $day, 'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => $day === 0], range(0, 6));
        $response = $this->postJson('/api/v2/branches', ['business_id' => $business->id, 'name' => 'Nueva', 'address' => 'Calle 1', 'schedules' => $schedules])->assertCreated();
        $id = $response->json('data.id');
        $this->assertDatabaseCount('business.branch_schedules', 7);
        $schedules[1]['close_time'] = '08:00';
        $this->putJson('/api/v2/branches/'.$id, ['name' => 'No guardar', 'schedules' => $schedules])->assertUnprocessable();
        $this->assertDatabaseHas('business.business_branches', ['id' => $id, 'name' => 'Nueva']);
        $schedules[1]['close_time'] = '19:00';
        $schedules[1]['day'] = 0;
        $this->putJson('/api/v2/branches/'.$id, ['schedules' => $schedules])->assertUnprocessable();
        $schedules[1]['day'] = 1;
        $this->putJson('/api/v2/branches/'.$id, ['schedules' => $schedules])->assertOk();
        $this->assertDatabaseCount('business.branch_schedules', 7);
        $this->assertDatabaseHas('business.branch_schedules', ['branch_id' => $id, 'day' => 1, 'close_time' => '19:00']);
        $this->postJson('/api/v2/branches', ['business_id' => $business->id, 'name' => 'Invalid', 'address' => 'Calle 1', 'lat' => 91, 'lng' => 0])->assertUnprocessable();
    }

    public function test_filters_apply_before_pagination_and_main_branch_cannot_be_deleted(): void
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Norte', 'address' => 'Calle 1', 'is_main_branch' => true, 'is_active' => false]);
        BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sur', 'address' => 'Calle 2', 'is_active' => true]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/branches?analytics=1&search=Norte&active=0')->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.summary.active', 0);
        $this->deleteJson('/api/v2/branches/'.$branch->id)->assertUnprocessable();
    }
}
