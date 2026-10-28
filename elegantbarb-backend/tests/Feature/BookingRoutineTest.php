<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingRoutineTest extends TestCase
{
    use RefreshDatabase;
    private User $user;
    private Appointment $source;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->user = User::factory()->create(['role' => 'CLIENTE']);
        $client = Client::factory()->create(['user_id' => $this->user->id]);
        $business = Business::factory()->create(['uses_professionals' => false]);
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Pereira', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00', 'is_closed' => false]);
        $service = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'direct', 'requires_professional' => false, 'duration_minutes' => 60, 'buffer_minutes' => 0, 'price' => 10000]);
        $this->source = Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => $client->id,
            'date' => '2026-10-02', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'COMPLETED', 'price' => 10000, 'final_price' => 10000, 'duration_minutes' => 60, 'participants' => 1, 'booking_model' => 'direct', 'payment_status' => 'PAID']);
        Sanctum::actingAs($this->user);
    }

    protected function tearDown(): void { Carbon::setTestNow(); parent::tearDown(); }

    public function test_routine_proposals_use_real_availability_and_never_create_reservations(): void
    {
        $routine = $this->createRoutine();
        $before = Appointment::count();
        $this->getJson('/api/v2/routines/'.$routine['id'].'/preview')->assertOk()
            ->assertJsonPath('data.occurrences.0.available', true)->assertJsonPath('data.occurrences.0.quote.total', 10000);
        $this->assertSame($before, Appointment::count());
        $busy = $this->source->replicate(); $busy->date = '2026-10-05'; $busy->status = 'CONFIRMED'; $busy->save();
        $this->getJson('/api/v2/routines/'.$routine['id'].'/preview')->assertOk()->assertJsonPath('data.occurrences.0.available', false);
    }

    public function test_attached_and_skipped_occurrences_keep_identity_and_history_when_future_dates_change(): void
    {
        $routine = $this->createRoutine();
        $occurrence = $routine['occurrences'][0];
        $booking = $this->source->replicate(); $booking->date = '2026-10-05'; $booking->status = 'CONFIRMED'; $booking->save();
        $this->postJson('/api/v2/routines/occurrences/'.$occurrence['id'].'/attach', ['appointment_id' => $booking->id])->assertOk()->assertJsonPath('data.status', 'BOOKED');
        $this->postJson('/api/v2/routines/occurrences/'.$occurrence['id'].'/attach', ['appointment_id' => $booking->id])->assertOk();
        $this->postJson('/api/v2/routines/occurrences/'.$routine['occurrences'][1]['id'].'/skip')->assertOk();
        $this->putJson('/api/v2/routines/'.$routine['id'], ['start_date' => '2026-11-02', 'start_time' => '11:00', 'interval_weeks' => 2])->assertOk()
            ->assertJsonPath('data.occurrences.0.id', $occurrence['id'])->assertJsonPath('data.occurrences.0.status', 'BOOKED')
            ->assertJsonPath('data.occurrences.1.status', 'SKIPPED')->assertJsonPath('data.occurrences.2.start_time', '11:00:00');
        $this->assertSame('2026-10-05', $booking->fresh()->date->toDateString());
        $this->postJson('/api/v2/routines/occurrences/'.$occurrence['id'].'/skip')->assertStatus(409);
    }

    public function test_foreign_routines_and_bookings_are_not_accessible_and_pause_removes_proposals(): void
    {
        $routine = $this->createRoutine();
        $this->putJson('/api/v2/routines/'.$routine['id'], ['status' => 'PAUSED'])->assertOk();
        $this->getJson('/api/v2/routines/'.$routine['id'].'/preview')->assertOk()->assertJsonPath('data.occurrences.0.available', false);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/routines/'.$routine['id'].'/preview')->assertNotFound();
        $this->postJson('/api/v2/routines/occurrences/'.$routine['occurrences'][0]['id'].'/skip')->assertNotFound();
        $this->postJson('/api/v2/routines', ['appointment_id' => $this->source->id, 'name' => 'Ajena', 'interval_weeks' => 1, 'count' => 3, 'start_date' => '2026-10-05', 'start_time' => '10:00'])->assertNotFound();
    }

    public function test_past_planned_occurrence_today_is_history_and_cannot_be_rewritten(): void
    {
        $routine = $this->createRoutine();
        $this->travelTo(Carbon::parse('2026-10-05 12:00:00', config('booking.timezone')));
        $this->putJson('/api/v2/routines/'.$routine['id'], ['start_date' => '2026-11-02', 'start_time' => '11:00', 'interval_weeks' => 2])->assertOk();
        $this->assertDatabaseHas('booking.routine_occurrences', ['id' => $routine['occurrences'][0]['id'], 'date' => '2026-10-05', 'start_time' => '10:00:00']);
        $this->assertDatabaseHas('booking.routine_occurrences', ['id' => $routine['occurrences'][1]['id'], 'date' => '2026-11-02', 'start_time' => '11:00:00']);
        $this->postJson('/api/v2/routines/occurrences/'.$routine['occurrences'][0]['id'].'/skip')->assertStatus(409);
    }

    private function createRoutine(): array
    {
        return $this->postJson('/api/v2/routines', ['appointment_id' => $this->source->id, 'name' => 'Mi rutina', 'interval_weeks' => 1, 'count' => 3, 'start_date' => '2026-10-05', 'start_time' => '10:00'])->assertCreated()->json('data');
    }
}
