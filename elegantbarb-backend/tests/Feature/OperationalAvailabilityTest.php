<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\OperationalBlock;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Professional;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperationalAvailabilityTest extends TestCase
{
    use RefreshDatabase;
    private Business $business;
    private BusinessBranch $branch;
    private Professional $professional;
    private Service $service;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->business = Business::factory()->create();
        $this->branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede', 'address' => 'Pereira', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $this->branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => false]);
        $this->user = User::factory()->create(['role' => 'PROFESSIONAL']);
        $this->professional = Professional::create(['business_id' => $this->business->id, 'user_id' => $this->user->id, 'name' => 'Profesional', 'is_active' => true]);
        $this->service = Service::factory()->create(['business_id' => $this->business->id, 'booking_model' => 'professional', 'duration_minutes' => 60, 'buffer_minutes' => 0, 'slot_interval_minutes' => 60]);
        DB::table('catalog.professional_services')->insert(['professional_id' => $this->professional->id, 'branch_id' => $this->branch->id, 'service_id' => $this->service->id, 'is_active' => true]);
        Sanctum::actingAs($this->user);
    }

    protected function tearDown(): void { Carbon::setTestNow(); parent::tearDown(); }

    public function test_professional_can_edit_own_schedule_but_not_a_colleague_or_foreign_branch(): void
    {
        $slots = $this->slots();
        $url = '/api/v2/operations/professionals/'.$this->professional->id.'/schedule';
        $this->putJson($url, ['branch_id' => $this->branch->id, 'slots' => $slots])->assertOk()->assertJsonCount(7, 'data');
        $other = Professional::create(['business_id' => $this->business->id, 'name' => 'Colega']);
        $this->putJson('/api/v2/operations/professionals/'.$other->id.'/schedule', ['branch_id' => $this->branch->id, 'slots' => $slots])->assertForbidden();
        $foreign = BusinessBranch::create(['business_id' => Business::factory()->create()->id, 'name' => 'Otra', 'address' => 'Pereira']);
        $this->putJson($url, ['branch_id' => $foreign->id, 'slots' => $slots])->assertNotFound();
    }

    public function test_breaks_and_absences_exclude_discovery_and_reservation_slots(): void
    {
        $this->putJson('/api/v2/operations/professionals/'.$this->professional->id.'/schedule', ['branch_id' => $this->branch->id, 'slots' => $this->slots()])->assertOk();
        $this->postJson('/api/v2/operations/blocks', ['business_id' => $this->business->id, 'professional_id' => $this->professional->id,
            'kind' => 'ABSENCE', 'reason' => 'Trámite', 'starts_at' => '2026-10-05T15:00', 'ends_at' => '2026-10-05T17:00'])->assertCreated();
        $data = ['business_id' => $this->business->id, 'branch_id' => $this->branch->id, 'service_id' => $this->service->id, 'professional_id' => $this->professional->id, 'date' => '2026-10-05'];
        $availability = app(AvailabilityService::class);
        foreach ([false, true] as $snapshot) {
            if ($snapshot) $availability->prime([$this->business->id], '2026-10-05', '2026-10-05');
            $slots = collect($availability->slots($data)['slots'])->keyBy('start_time');
            $this->assertFalse($slots['12:00:00']['available']);
            $this->assertFalse($slots['15:00:00']['available']);
            $this->assertTrue($slots['14:00:00']['available']);
            $this->assertTrue($slots['17:00:00']['available']);
        }
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        DB::transaction(fn () => app(AvailabilityService::class)->reserve($data + ['start_time' => '15:00']));
    }

    public function test_professional_cannot_close_shared_resources_or_remove_others_absences(): void
    {
        $this->postJson('/api/v2/operations/blocks', ['business_id' => $this->business->id, 'branch_id' => $this->branch->id,
            'kind' => 'CLOSURE', 'reason' => 'Cierre', 'starts_at' => '2026-10-05T15:00', 'ends_at' => '2026-10-05T17:00'])->assertForbidden();
        $other = Professional::create(['business_id' => $this->business->id, 'name' => 'Colega']);
        $block = OperationalBlock::create(['business_id' => $this->business->id, 'professional_id' => $other->id, 'kind' => 'ABSENCE', 'reason' => 'Ausencia', 'starts_at' => now()->addDay(), 'ends_at' => now()->addDays(2), 'created_by' => $this->user->id]);
        $this->deleteJson('/api/v2/operations/blocks/'.$block->id)->assertForbidden();
    }

    private function slots(): array
    {
        return array_map(fn (int $day) => ['day_of_week' => $day, 'is_available' => true, 'start_time' => '09:00', 'end_time' => '18:00', 'break_start_time' => '12:00', 'break_end_time' => '13:00'], range(0, 6));
    }
}
