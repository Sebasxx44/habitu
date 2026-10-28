<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Benefits\Models\ServiceGift;
use App\Modules\Benefits\Models\ServicePackage;
use App\Modules\Benefits\Services\ServiceGiftService;
use App\Modules\Benefits\Services\ServicePackageService;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Finance\Models\BookingPaymentPolicy;
use App\Modules\Platform\Services\GoogleCalendarService;
use App\Modules\Platform\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PackagesAndGiftsTest extends TestCase
{
    use RefreshDatabase;

    private User $client;
    private User $admin;
    private Business $business;
    private BusinessBranch $branch;
    private Service $first;
    private Service $second;
    private ServicePackage $package;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-03 12:00:00', 'UTC'));
        Http::preventStrayRequests();
        $this->mock(WhatsAppService::class, fn ($mock) => $mock->shouldReceive('sendBookingConfirmation', 'sendPostServiceSurvey')->andReturn(null));
        $this->mock(GoogleCalendarService::class, fn ($mock) => $mock->shouldReceive('pushAppointmentToCalendar')->andReturn(null));
        $this->client = User::factory()->create(['role' => 'CLIENTE']);
        $this->admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $this->business = Business::factory()->create(['owner_user_id' => $this->admin->id]);
        $this->branch = BusinessBranch::create(['business_id' => $this->business->id, 'name' => 'Sede', 'address' => 'Calle 1', 'is_active' => true]);
        $attributes = ['business_id' => $this->business->id, 'booking_model' => 'direct', 'requires_professional' => false,
            'duration_minutes' => 45, 'buffer_minutes' => 15, 'requires_confirmation' => false, 'allow_cancellation' => true];
        $this->first = Service::factory()->create($attributes);
        $this->second = Service::factory()->create($attributes);
        DB::table('business.branch_schedules')->insert(['branch_id' => $this->branch->id, 'day' => 'MONDAY', 'open_time' => '09:00', 'close_time' => '18:00']);
        $this->package = ServicePackage::create(['business_id' => $this->business->id, 'name' => 'Dos servicios', 'service_ids' => [$this->first->id, $this->second->id], 'is_active' => true]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function preview(): \App\Modules\Benefits\Models\PackageProposal
    {
        return app(ServicePackageService::class)->preview($this->client, $this->package, ['branch_id' => $this->branch->id, 'date' => '2026-10-05', 'start_time' => '10:00']);
    }

    private function booking(Service $service, string $time = '10:00'): Appointment
    {
        return app(AppointmentService::class)->create(['business_id' => $this->business->id, 'branch_id' => $this->branch->id,
            'service_id' => $service->id, 'client_user_id' => $this->client->id, 'date' => '2026-10-05', 'start_time' => $time])->data;
    }

    private function gift(): ServiceGift
    {
        return app(ServiceGiftService::class)->issue($this->admin, ['business_id' => $this->business->id, 'service_id' => $this->first->id,
            'expires_at' => '2026-12-31', 'restrictions' => 'Una atención de 45 minutos en esta sede.', 'idempotency_key' => (string) Str::uuid()]);
    }

    public function test_package_preview_does_not_reserve_and_confirmation_is_atomic_and_idempotent(): void
    {
        $proposal = $this->preview();
        $this->assertSame(0, Appointment::count());
        $this->assertSame('11:00', $proposal->snapshot['items'][1]['request']['start_time']);
        $this->assertSame('60000.00', $proposal->snapshot['total']);
        $key = (string) Str::uuid();
        $service = app(ServicePackageService::class);
        $result = $service->confirm($this->client, $proposal->id, $key);
        $replay = $service->confirm($this->client, $proposal->id, $key);
        $this->assertSame($result->appointment_ids, $replay->appointment_ids);
        $this->assertSame(2, Appointment::count());
        $this->assertSame(2, Appointment::where('payment_status', 'PENDING')->count());
        $this->assertSame(0, DB::table('finance.payments')->count());
        Http::assertNothingSent();
    }

    public function test_conflict_in_later_service_rolls_back_the_entire_package(): void
    {
        $proposal = $this->preview();
        $existing = $this->booking($this->second, '11:00');
        try {
            app(ServicePackageService::class)->confirm($this->client, $proposal->id, (string) Str::uuid());
            $this->fail('A partially available package must never create a partial booking.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('start_time', $exception->errors());
        }
        $this->assertSame([$existing->id], Appointment::pluck('id')->all());
        $this->assertSame('PREVIEW', $proposal->fresh()->status);
    }

    public function test_expired_or_repriced_proposal_needs_another_confirmation(): void
    {
        $proposal = $this->preview();
        $this->first->update(['price' => '40000']);
        try {
            app(ServicePackageService::class)->confirm($this->client, $proposal->id, (string) Str::uuid());
            $this->fail('Price changes require another acceptance.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('expected_total', $exception->errors());
        }
        $this->assertSame(0, Appointment::count());
        $this->travel(11)->minutes();
        $this->expectException(HttpException::class);
        app(ServicePackageService::class)->confirm($this->client, $proposal->id, (string) Str::uuid());
    }

    public function test_online_only_policy_is_not_bypassed_by_package_confirmation(): void
    {
        BookingPaymentPolicy::create(['business_id' => $this->business->id, 'allowed_modes' => ['FULL'], 'hold_minutes' => 15,
            'cancellation_terms' => 'Condiciones del negocio.', 'updated_by' => $this->admin->id]);
        $this->expectException(HttpException::class);
        $this->preview();
    }

    public function test_packages_cannot_include_services_from_another_business(): void
    {
        Sanctum::actingAs($this->admin);
        $foreign = Service::factory()->create();
        $this->postJson('/api/v2/commerce/packages', ['business_id' => $this->business->id, 'name' => 'Inválido', 'service_ids' => [$this->first->id, $foreign->id]])->assertUnprocessable();
        $this->assertSame(1, ServicePackage::count());
    }

    public function test_gift_claim_and_redemption_have_one_auditable_entitlement_without_fabricating_cash(): void
    {
        $gift = $this->gift();
        $service = app(ServiceGiftService::class);
        $service->claim($this->client, $gift->code);
        $service->claim($this->client, $gift->code);
        $appointment = $this->booking($this->first);
        app(AppointmentService::class)->complete($appointment->id);
        $service->redeem($this->admin, $gift, $appointment->id);
        $service->redeem($this->admin, $gift, $appointment->id);
        $this->assertSame('REDEEMED', $gift->fresh()->status);
        $this->assertSame('COVERED_BY_GIFT', $appointment->fresh()->payment_status);
        $this->assertSame(3, DB::table('loyalty.service_gift_events')->where('gift_id', $gift->id)->count());
        $this->assertSame(0, DB::table('finance.payments')->count());
        $this->assertSame(0, DB::table('finance.wallet_transactions')->count());
        $this->assertFalse($gift->snapshot['cash_collected']);
    }

    public function test_claimed_gift_cannot_be_taken_by_another_user_or_redeemed_for_unfinished_service(): void
    {
        $gift = $this->gift();
        $service = app(ServiceGiftService::class);
        $service->claim($this->client, $gift->code);
        try {
            $service->claim(User::factory()->create(['role' => 'CLIENTE']), $gift->code);
            $this->fail('An entitlement cannot be transferred by knowing its code.');
        } catch (HttpException $exception) { $this->assertSame(403, $exception->getStatusCode()); }
        $appointment = $this->booking($this->first);
        $this->expectException(HttpException::class);
        $service->redeem($this->admin, $gift, $appointment->id);
    }

    public function test_expired_voucher_and_unauthorized_business_cannot_be_used(): void
    {
        $gift = $this->gift();
        $gift->update(['expires_at' => now()->subMinute()]);
        Sanctum::actingAs($this->client);
        $this->postJson('/api/v2/commerce/gifts/claim', ['code' => $gift->code])->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->postJson('/api/v2/commerce/gifts', ['business_id' => $this->business->id, 'service_id' => $this->first->id,
            'expires_at' => '2026-12-31', 'restrictions' => 'No autorizado', 'idempotency_key' => (string) Str::uuid()])->assertForbidden();
        $this->assertSame(1, ServiceGift::count());
    }
}
