<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Core\Enums\AppointmentStatus;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Booking\Services\AvailabilityService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Finance\Models\CheckoutRefund;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Services\CheckoutRefundService;
use App\Modules\Finance\Services\ReservationCheckoutService;
use App\Modules\Finance\Services\WompiCheckoutService;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReservationCheckoutTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private array $booking;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        config(['services.wompi.environment' => 'test', 'services.wompi.public_key' => 'pub_test_local', 'services.wompi.private_key' => 'prv_test_local',
            'services.wompi.integrity_secret' => 'test_integrity_local', 'services.wompi.events_secret' => 'test_events_local', 'services.wompi.frontend_url' => 'https://habitu.test']);
        Http::preventStrayRequests();
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendCancellationNotification')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar', 'deleteCalendarEvent')->andReturn(null));
        $this->user = User::factory()->create(['role' => 'CLIENTE']);
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Calle 1', 'is_active' => true]);
        $service = Service::factory()->create(['business_id' => $business->id, 'booking_model' => 'direct', 'requires_professional' => false,
            'duration_minutes' => 60, 'buffer_minutes' => 0, 'requires_confirmation' => false, 'allow_cancellation' => true]);
        DB::table('business.branch_schedules')->insert(['branch_id' => $branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        BookingPaymentPolicy::create(['business_id' => $business->id, 'allowed_modes' => ['FULL', 'DEPOSIT', 'ON_SITE'], 'deposit_percentage' => 30,
            'hold_minutes' => 15, 'cancellation_terms' => 'Cancelación autorizada según plazo del servicio.', 'version' => 1, 'updated_by' => $business->owner_user_id]);
        $this->booking = ['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id,
            'date' => '2026-10-05', 'start_time' => '10:00', 'expected_total' => '30000.00', 'payment_mode' => 'FULL',
            'accepted_terms' => true, 'expected_policy_version' => 1, 'idempotency_key' => (string) Str::uuid()];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function create(array $changes = []): array
    {
        return app(ReservationCheckoutService::class)->create($this->user, array_replace($this->booking, $changes));
    }

    private function verify(CheckoutOrder $order, string $status = 'APPROVED'): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::preventStrayRequests();
        $transaction = ['id' => 'payment-'.$order->id, 'reference' => $order->reference, 'amount_in_cents' => $order->amount_in_cents,
            'currency' => 'COP', 'status' => $status, 'payment_method_type' => 'NEQUI'];
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::response(['data' => $transaction])]);
        $time = time();
        app(WompiCheckoutService::class)->webhook(['event' => 'transaction.updated', 'environment' => 'test', 'timestamp' => $time,
            'data' => ['transaction' => $transaction], 'signature' => ['properties' => ['transaction.amount_in_cents', 'transaction.id', 'transaction.status'],
                'checksum' => hash('sha256', $transaction['amount_in_cents'].$transaction['id'].$status.$time.'test_events_local')]]);
    }

    public function test_direct_checkout_holds_inventory_and_snapshots_terms_without_wallet_topup(): void
    {
        $result = $this->create();
        $this->assertSame('PENDING', $result['appointment']['status']);
        $this->assertSame('PENDING', $result['appointment']['payment_status']);
        $this->assertSame('30000.00', $result['snapshot']['pay_now']);
        $this->assertSame('0.00', $result['snapshot']['pay_later']);
        $this->assertSame('reservation', $result['payment_order']['purpose']);
        $this->assertSame(0, Wallet::count());
        $this->assertNotNull($result['appointment']['hold_expires_at']);
        $replay = $this->create();
        $this->assertSame($result['payment_order']['id'], $replay['payment_order']['id']);
        $this->assertSame(1, Appointment::count());
        $this->assertSame(1, CheckoutOrder::count());
        Http::assertNothingSent();
        $this->expectException(ValidationException::class);
        $this->create(['payment_mode' => 'DEPOSIT']);
    }

    public function test_verified_approval_creates_one_payment_and_duplicate_notifications_do_not_duplicate_fulfillment(): void
    {
        $result = $this->create();
        $order = CheckoutOrder::findOrFail($result['payment_order']['id']);
        $this->verify($order);
        $this->verify($order);
        $appointment = Appointment::findOrFail($result['appointment']['id']);
        $this->assertSame(AppointmentStatus::CONFIRMED, $appointment->status);
        $this->assertSame('PAID', $appointment->payment_status);
        $this->assertNull($appointment->hold_expires_at);
        $this->assertSame(1, DB::table('finance.payments')->count());
        $this->assertSame(1, DB::table('booking.appointment_events')->where('type', 'payment_confirmed')->count());
        $this->assertSame('APPLIED', $order->fresh()->metadata['resolution']);
    }

    public function test_deposit_is_partial_and_on_site_confirmation_does_not_claim_payment(): void
    {
        $deposit = $this->create(['payment_mode' => 'DEPOSIT']);
        $this->assertSame('9000.00', $deposit['snapshot']['pay_now']);
        $this->assertSame('21000.00', $deposit['snapshot']['pay_later']);
        $this->verify(CheckoutOrder::findOrFail($deposit['payment_order']['id']));
        $this->assertSame('PARTIALLY_PAID', Appointment::findOrFail($deposit['appointment']['id'])->payment_status);
        $site = $this->create(['payment_mode' => 'ON_SITE', 'start_time' => '12:00', 'idempotency_key' => (string) Str::uuid()]);
        $this->assertNull($site['payment_order']);
        $this->assertSame('CONFIRMED', $site['appointment']['status']);
        $this->assertSame('PENDING', $site['appointment']['payment_status']);
        $this->assertSame('0.00', $site['snapshot']['pay_now']);
    }

    public function test_expired_inventory_can_be_sold_but_late_approval_only_requests_traceable_refund(): void
    {
        $first = $this->create();
        $order = CheckoutOrder::findOrFail($first['payment_order']['id']);
        $this->travel(16)->minutes();
        $replacement = $this->create(['idempotency_key' => (string) Str::uuid(), 'payment_mode' => 'ON_SITE']);
        $this->verify($order);
        $this->verify($order);
        $firstAppointment = Appointment::findOrFail($first['appointment']['id']);
        $this->assertSame(AppointmentStatus::CANCELLED, $firstAppointment->status);
        $this->assertSame('REFUND_PENDING', $firstAppointment->payment_status);
        $this->assertSame(AppointmentStatus::CONFIRMED, Appointment::findOrFail($replacement['appointment']['id'])->status);
        $this->assertSame(1, CheckoutRefund::count());
        $this->assertSame('REQUESTED', CheckoutRefund::firstOrFail()->status);
        $this->assertSame('REFUND_REQUESTED', $order->fresh()->metadata['resolution']);
        $this->assertSame(0, Wallet::count());
    }

    public function test_refund_requests_reserve_remaining_eligibility_and_only_provider_void_completes(): void
    {
        $result = $this->create();
        $order = CheckoutOrder::findOrFail($result['payment_order']['id']);
        $this->verify($order);
        $refunds = app(CheckoutRefundService::class);
        $key = (string) Str::uuid();
        $refund = $refunds->request($order->fresh(), 1000000, $key, 'Servicio cancelado por cliente');
        $this->assertSame($refund->id, $refunds->request($order->fresh(), 1000000, $key, 'Servicio cancelado por cliente')->id);
        try {
            $refunds->request($order->fresh(), 2000001, (string) Str::uuid(), 'Importe excesivo solicitado');
            $this->fail('Cannot refund more than the remaining collected amount.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount', $exception->errors());
        }
        $this->verify($order, 'VOIDED');
        $this->verify($order, 'VOIDED');
        $this->assertSame(3000000, (int) CheckoutRefund::where('status', 'COMPLETED')->sum('amount_in_cents'));
        $this->assertSame('REFUNDED', Appointment::findOrFail($result['appointment']['id'])->payment_status);
        $this->assertSame(0, Wallet::count());
    }

    public function test_unverified_browser_redirect_cannot_mark_paid_and_ownership_is_enforced(): void
    {
        $result = $this->create();
        Sanctum::actingAs($this->user);
        $this->getJson('/api/v2/wompi/orders/'.$result['payment_order']['id'].'?status=APPROVED')->assertOk()->assertJsonPath('data.status', 'PENDING');
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/wompi/orders/'.$result['payment_order']['id'])->assertNotFound();
        $this->assertSame(0, DB::table('finance.payments')->count());
        Http::assertNothingSent();
    }

    public function test_policy_change_and_disabled_gateway_do_not_create_booking_or_charge(): void
    {
        BookingPaymentPolicy::whereKey($this->booking['business_id'])->update(['version' => 2]);
        try {
            $this->create();
            $this->fail('Changed terms require another acceptance.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('expected_policy_version', $exception->errors());
        }
        $this->assertSame(0, Appointment::count());
        config(['services.wompi.private_key' => '']);
        Sanctum::actingAs($this->user);
        $this->postJson('/api/v2/booking/checkout', array_replace($this->booking, ['expected_policy_version' => 2]))->assertStatus(503);
        $this->assertSame(0, CheckoutOrder::count());
        Http::assertNothingSent();
    }

    public function test_unpaid_hold_cannot_be_manually_confirmed_and_expiry_releases_availability(): void
    {
        $result = $this->create();
        try {
            app(AppointmentService::class)->update($result['appointment']['id'], ['status' => 'CONFIRMED']);
            $this->fail('A manual status change must not bypass payment verification.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('status', $exception->errors());
        }
        $slots = app(AvailabilityService::class)->slots($this->booking);
        $this->assertFalse(collect($slots['slots'])->firstWhere('start_time', '10:00:00')['available']);
        $this->travel(16)->minutes();
        app(ReservationCheckoutService::class)->expire();
        $this->assertSame(AppointmentStatus::CANCELLED, Appointment::findOrFail($result['appointment']['id'])->status);
        $slots = app(AvailabilityService::class)->slots($this->booking);
        $this->assertTrue(collect($slots['slots'])->firstWhere('start_time', '10:00:00')['available']);
    }

    public function test_online_only_policy_cannot_be_bypassed_through_legacy_booking_api(): void
    {
        BookingPaymentPolicy::whereKey($this->booking['business_id'])->update(['allowed_modes' => ['FULL']]);
        Sanctum::actingAs($this->user);
        $this->postJson('/api/v2/appointments', $this->booking)->assertUnprocessable()->assertJsonValidationErrors('payment_mode');
        $this->assertSame(0, Appointment::count());
    }

    public function test_lost_webhook_is_reconciled_server_side_and_timeout_never_creates_another_order(): void
    {
        $result = $this->create();
        $order = CheckoutOrder::findOrFail($result['payment_order']['id']);
        $transaction = ['id' => 'pending-'.$order->id, 'reference' => $order->reference, 'amount_in_cents' => $order->amount_in_cents,
            'currency' => 'COP', 'status' => 'PENDING', 'payment_method_type' => 'NEQUI'];
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()->push(['data' => $transaction])->pushStatus(503)
            ->push(['data' => array_replace($transaction, ['status' => 'APPROVED'])])]);
        $checkout = app(WompiCheckoutService::class);
        $checkout->reconcile($this->user->id, $order->id, $transaction['id']);
        $this->assertSame($transaction['id'], $order->fresh()->provider_transaction_id);
        $this->assertNull($checkout->present($order->fresh())['checkout_url']);
        $this->assertSame(0, $checkout->reconcilePending());
        $this->assertSame('PENDING', $order->fresh()->status);
        $this->assertSame(1, CheckoutOrder::count());
        $this->assertSame(1, $checkout->reconcilePending());
        $this->assertSame('APPROVED', $order->fresh()->status);
        $this->assertSame(1, DB::table('finance.payments')->count());
    }
}
