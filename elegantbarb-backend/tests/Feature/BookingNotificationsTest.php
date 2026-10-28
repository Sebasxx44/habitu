<?php

namespace Tests\Feature;

use App\Jobs\Booking\SendBookingEmail;
use App\Mail\BookingUpdate;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentNotificationService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\Platform\Models\Notification;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BookingNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_event_is_visible_immediately_and_email_disabled_is_not_sent(): void
    {
        config(['booking.email_enabled' => false]);
        Mail::fake();
        $appointment = $this->appointment('2030-05-01', '10:00:00');
        $event = DB::table('booking.appointment_events')->insertGetId(['appointment_id' => $appointment->id, 'type' => 'created', 'created_at' => now()]);
        $service = app(AppointmentNotificationService::class);
        $service->record($event);
        $service->record($event);
        $this->assertSame(2, Notification::count());
        $this->assertSame(2, DB::table('booking.notification_deliveries')->where('status', 'DISABLED')->count());
        $this->assertSame('/cliente/appointments/'.$appointment->id, Notification::where('user_id', $appointment->client->user_id)->first()->data['url']);
        $this->assertSame(0, $service->dispatchPendingEmails());
        Mail::assertNothingSent();
    }

    public function test_reminders_deduplicate_per_appointment_and_time_and_skip_cancelled(): void
    {
        config(['booking.email_enabled' => false, 'booking.reminder_minutes' => [60]]);
        Carbon::setTestNow(Carbon::parse('2030-05-01 09:05:00', 'America/Bogota'));
        $first = $this->appointment('2030-05-01', '10:00:00');
        $this->appointment('2030-05-01', '10:00:00', $first->client);
        $this->appointment('2030-05-01', '10:00:00')->update(['status' => 'CANCELLED']);
        $service = app(AppointmentNotificationService::class);
        $this->assertSame(2, $service->sendDueReminders());
        $this->assertSame(0, $service->sendDueReminders());
        $this->assertSame(2, Notification::where('user_id', $first->client->user_id)->where('type', 'APPOINTMENT_REMINDER')->count());
        $first->update(['start_time' => '11:00:00', 'end_time' => '12:00:00']);
        Carbon::setTestNow(Carbon::parse('2030-05-01 10:05:00', 'America/Bogota'));
        $this->assertSame(1, $service->sendDueReminders());
    }

    public function test_email_replay_is_noop_and_failed_transport_is_never_marked_sent(): void
    {
        config(['booking.email_enabled' => true, 'mail.default' => 'smtp']);
        $appointment = $this->appointment('2030-05-01', '10:00:00');
        $event = DB::table('booking.appointment_events')->insertGetId(['appointment_id' => $appointment->id, 'type' => 'confirmed', 'created_at' => now()]);
        app(AppointmentNotificationService::class)->record($event);
        $ids = DB::table('booking.notification_deliveries')->orderBy('id')->pluck('id');
        Mail::fake();
        (new SendBookingEmail($ids[0]))->handle();
        (new SendBookingEmail($ids[0]))->handle();
        Mail::assertSent(BookingUpdate::class, 1);
        $this->assertSame('SENT', DB::table('booking.notification_deliveries')->find($ids[0])->status);
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('Private transport detail'));
        try {
            (new SendBookingEmail($ids[1]))->handle();
            $this->fail('Transport failure must fail the job.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Booking email delivery failed.', $exception->getMessage());
        }
        $failed = DB::table('booking.notification_deliveries')->find($ids[1]);
        $this->assertSame('PENDING', $failed->status);
        $this->assertNull($failed->sent_at);
        $this->assertSame(1, $failed->attempts);
        $this->assertSame('MAIL_TRANSPORT_FAILED', $failed->last_error);
    }

    private function appointment(string $date, string $time, ?Client $client = null): Appointment
    {
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Principal', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'client_id' => ($client ?? Client::factory()->create())->id, 'booking_code' => 'TEST-'.\Illuminate\Support\Str::random(12),
            'date' => $date, 'start_time' => $time, 'end_time' => '12:00:00', 'status' => 'CONFIRMED', 'price' => 30000,
            'final_price' => 30000, 'payment_status' => 'PENDING', 'currency' => 'COP']);
    }
}
