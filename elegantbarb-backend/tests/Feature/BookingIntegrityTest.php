<?php

namespace Tests\Feature;

use App\Core\Enums\AppointmentStatus;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private array $booking;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendCancellationNotification', 'sendPostServiceSurvey')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar', 'deleteCalendarEvent')->andReturn(null));
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Principal', 'address' => 'Calle 1', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $business->id, 'duration_minutes' => 45, 'buffer_minutes' => 15]);
        $professional = Professional::create(['business_id' => $business->id, 'name' => 'Profesional', 'is_active' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        $this->booking = ['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'professional_id' => $professional->id, 'client_id' => Client::factory()->create()->id,
            'date' => '2026-10-05', 'start_time' => '10:00', 'price' => 1];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_price_and_duration_come_from_service_and_busy_slots_include_buffer(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        $this->assertSame('30000.00', $appointment->final_price);
        $this->assertSame('11:00', $appointment->end_time->format('H:i'));
        $availability = app(AvailabilityService::class)->slots($this->booking);
        $this->assertSame('America/Bogota', $availability['timezone']);
        $slots = collect($availability['slots'])->keyBy('start_time');
        $this->assertFalse($slots['10:45:00']['available']);
        $this->assertTrue($slots['11:00:00']['available']);
        $this->assertArrayNotHasKey('08:45:00', $slots->all());
    }

    public function test_overlap_is_rejected_without_creating_second_appointment(): void
    {
        app(AppointmentService::class)->create($this->booking);
        try {
            app(AppointmentService::class)->create(array_replace($this->booking, ['start_time' => '10:45']));
            $this->fail('An overlapping booking must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('start_time', $exception->errors());
        }
        $this->assertSame(1, Appointment::count());
        $this->assertTrue(app(AppointmentService::class)->create(array_replace($this->booking, ['start_time' => '11:00']))->success);
    }

    public function test_closed_day_and_cross_business_references_are_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(AppointmentService::class)->create(array_replace($this->booking, ['date' => '2026-10-06']));
    }

    public function test_a_service_from_another_business_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(AppointmentService::class)->create(array_replace($this->booking, ['service_id' => Service::factory()->create()->id]));
    }

    public function test_completed_appointment_cannot_be_reopened_or_rescheduled(): void
    {
        $service = app(AppointmentService::class);
        $appointment = $service->create($this->booking)->data;
        $service->complete($appointment->id);
        try {
            $service->update($appointment->id, ['status' => 'PENDING']);
            $this->fail('Terminal state must remain terminal.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('status', $exception->errors());
        }
        $this->expectException(ValidationException::class);
        $service->reschedule($appointment->id, ['date' => '2026-10-05', 'start_time' => '12:00']);
    }

    public function test_cancel_is_idempotent_and_releases_slot(): void
    {
        $service = app(AppointmentService::class);
        $appointment = $service->create($this->booking)->data;
        $service->cancel($appointment->id, 'Cambio de planes');
        $service->cancel($appointment->id, 'Reintento');
        $this->assertSame(1, DB::table('booking.appointment_cancellations')->where('appointment_id', $appointment->id)->count());
        $this->assertSame(AppointmentStatus::CANCELLED, $appointment->fresh()->status);
        $this->assertTrue($service->create($this->booking)->success);
    }

    public function test_client_cannot_create_appointment_for_another_client(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/appointments', $this->booking)->assertForbidden();
        $this->assertSame(0, Appointment::count());
    }
    public function test_paginated_client_agenda_preserves_scope_and_stable_order(): void
    {
        $service = app(AppointmentService::class);
        $first = $service->create($this->booking)->data;
        $second = $service->create(array_replace($this->booking, ['start_time' => '12:00']))->data;
        $other = Client::factory()->create();
        $service->create(array_replace($this->booking, ['start_time' => '14:00', 'client_id' => $other->id]));
        $user = User::findOrFail(Client::findOrFail($this->booking['client_id'])->user_id);
        $user->update(['role' => 'CLIENTE', 'cliente_id' => $this->booking['client_id']]);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/appointments?view=upcoming&per_page=1&page=1')
            ->assertOk()->assertJsonPath('data.total', 2)->assertJsonPath('data.last_page', 2)
            ->assertJsonPath('data.data.0.id', $first->id);
        $this->getJson('/api/v2/appointments?view=upcoming&per_page=1&page=2')
            ->assertOk()->assertJsonPath('data.data.0.id', $second->id);
        $this->getJson('/api/v2/appointments?view=completed&per_page=1')
            ->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_rescheduling_availability_can_exclude_only_owned_appointment(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        $user = User::findOrFail(Client::findOrFail($this->booking['client_id'])->user_id);
        $user->update(['role' => 'CLIENTE', 'cliente_id' => $this->booking['client_id']]);
        Sanctum::actingAs($user);
        $query = http_build_query(array_merge($this->booking, ['appointment_id' => $appointment->id]));
        $response = $this->getJson('/api/v2/appointments/availability?' . $query)->assertOk();
        $slots = collect($response->json('data.slots'))->keyBy('start_time');
        $this->assertTrue($slots['10:00:00']['available']);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/appointments/availability?' . $query)->assertForbidden();
    }

    public function test_whatsapp_requires_signature_and_appointment_phone_ownership(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        Client::findOrFail($appointment->client_id)->update(['phone' => '+57 300 123 4567']);
        $this->postJson('/api/v2/webhooks/whatsapp', [])->assertForbidden();
        $this->whatsapp('CONFIRM_APPOINTMENT_' . $appointment->id, '573009999999')->assertOk();
        $this->assertSame(AppointmentStatus::PENDING, $appointment->fresh()->status);
        $this->whatsapp('CONFIRM_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->assertSame(AppointmentStatus::CONFIRMED, $appointment->fresh()->status);
    }

    public function test_whatsapp_cancel_replay_is_atomic_and_reschedule_preserves_terminal_state(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        Client::findOrFail($appointment->client_id)->update(['phone' => '3001234567']);
        $this->whatsapp('CANCEL_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->whatsapp('CANCEL_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->assertSame(1, DB::table('booking.appointment_cancellations')->where('appointment_id', $appointment->id)->count());
        $this->whatsapp('RESCHEDULE_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->assertSame(AppointmentStatus::CANCELLED, $appointment->fresh()->status);
        $this->assertSame(0, DB::table('marketing.notifications')->where('type', 'appointment_reschedule_requested')->count());
    }

    public function test_whatsapp_reschedule_request_keeps_slot_and_creates_one_notification(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        Client::findOrFail($appointment->client_id)->update(['phone' => '3001234567']);
        $this->whatsapp('RESCHEDULE_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->whatsapp('RESCHEDULE_APPOINTMENT_' . $appointment->id, '573001234567')->assertOk();
        $this->assertSame(AppointmentStatus::PENDING, $appointment->fresh()->status);
        $this->assertSame(1, DB::table('marketing.notifications')->where('type', 'appointment_reschedule_requested')->count());
    }

    public function test_resource_capacity_counts_simultaneous_reservations_not_adjacent_ones(): void
    {
        Service::findOrFail($this->booking['service_id'])->update(['requires_professional' => false, 'duration_minutes' => 60, 'buffer_minutes' => 0]);
        $resource = \App\Modules\Booking\Models\Resource::create([
            'business_id' => $this->booking['business_id'], 'branch_id' => $this->booking['branch_id'],
            'name' => 'Sala compartida', 'capacity' => 2, 'is_active' => true,
        ]);
        Service::findOrFail($this->booking['service_id'])->resources()->attach($resource->id);
        $booking = array_replace($this->booking, ['professional_id' => null, 'resource_id' => $resource->id]);
        $service = app(AppointmentService::class);
        $service->create($booking);
        $service->create(array_replace($booking, ['start_time' => '11:00']));
        $slots = collect(app(AvailabilityService::class)->slots($booking)['slots'])->keyBy('start_time');
        $this->assertTrue($slots['10:30:00']['available']);
        $this->assertTrue($service->create(array_replace($booking, ['start_time' => '10:30', 'client_id' => Client::factory()->create()->id]))->success);
        $this->expectException(ValidationException::class);
        $service->create(array_replace($booking, ['start_time' => '10:45', 'client_id' => Client::factory()->create()->id]));
    }

    public function test_inactive_business_cannot_receive_new_reservations(): void
    {
        Business::findOrFail($this->booking['business_id'])->update(['is_active' => false]);
        $this->expectException(ValidationException::class);
        app(AppointmentService::class)->create($this->booking);
    }

    public function test_manual_appointment_update_cannot_forge_payment_or_refund_status(): void
    {
        $appointment = app(AppointmentService::class)->create($this->booking)->data;
        Sanctum::actingAs(User::factory()->create(['role' => 'SUPERADMIN']));
        $this->putJson('/api/v2/appointments/' . $appointment->id, ['payment_status' => 'PAID'])->assertUnprocessable();
        $this->putJson('/api/v2/appointments/' . $appointment->id, ['payment_status' => 'REFUNDED'])->assertUnprocessable();
        $this->assertSame('PENDING', $appointment->fresh()->payment_status);
    }

    private function whatsapp(string $payload, string $from): \Illuminate\Testing\TestResponse
    {
        config(['services.whatsapp.app_secret' => 'test-only-signature-secret']);
        $body = json_encode(['object' => 'whatsapp_business_account', 'entry' => [['changes' => [['value' => [
            'messages' => [['type' => 'button', 'from' => $from, 'button' => ['payload' => $payload]]],
        ]]]]]], JSON_THROW_ON_ERROR);
        return $this->call('POST', '/api/v2/webhooks/whatsapp', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => 'sha256=' . hash_hmac('sha256', $body, 'test-only-signature-secret'),
        ], $body);
    }

}
