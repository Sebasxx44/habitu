<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentPricingService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\Marketing\Models\Promotion;
use App\Modules\Marketing\Services\ReferralService;
use App\Modules\People\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReferralProgramTest extends TestCase
{
    use RefreshDatabase;
    private User $referrer;
    private User $referred;
    private string $code;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(12, 0));
        $this->referrer = User::factory()->create(['role' => 'CLIENTE']);
        $this->referred = User::factory()->create(['role' => 'CLIENTE']);
        $this->code = app(ReferralService::class)->summary($this->referrer)['code'];
        Sanctum::actingAs($this->referred);
    }

    public function test_attribution_rejects_self_old_accounts_and_duplicates_but_same_code_is_idempotent(): void
    {
        Sanctum::actingAs($this->referrer);
        $this->postJson('/api/v2/referrals/apply', ['code' => $this->code])->assertUnprocessable();
        Sanctum::actingAs($this->referred);
        foreach (range(1, 2) as $attempt) $this->postJson('/api/v2/referrals/apply', ['code' => $this->code])->assertOk();
        $this->assertDatabaseCount('marketing.referral_attributions', 1);
        $anotherCode = app(ReferralService::class)->summary(User::factory()->create(['role' => 'CLIENTE']))['code'];
        $this->postJson('/api/v2/referrals/apply', ['code' => $anotherCode])->assertStatus(409);
        $old = User::factory()->create(['role' => 'CLIENTE', 'created_at' => now()->subDays(31)]);
        Sanctum::actingAs($old);
        $this->postJson('/api/v2/referrals/apply', ['code' => $this->code])->assertUnprocessable();
    }

    public function test_reward_needs_verified_full_payment_is_issued_once_owned_single_use_and_reversed_on_refund(): void
    {
        $this->postJson('/api/v2/referrals/apply', ['code' => $this->code])->assertOk();
        $booking = $this->appointment();
        $this->program($booking->business_id);
        $attribution = DB::table('marketing.referral_attributions')->value('id');
        $referrals = app(ReferralService::class);
        $referrals->evaluate($attribution);
        $this->assertDatabaseCount('marketing.referral_rewards', 0);
        $this->payment($booking, 9999);
        $referrals->evaluate($attribution);
        $this->assertDatabaseCount('marketing.referral_rewards', 0);
        $this->payment($booking, 1);
        $referrals->evaluate($attribution); $referrals->evaluate($attribution);
        $this->assertDatabaseCount('marketing.referral_rewards', 2);
        $reward = DB::table('marketing.referral_rewards')->where('user_id', $this->referrer->id)->first();
        $client = Client::factory()->create(['business_id' => $booking->business_id, 'user_id' => $this->referrer->id]);
        $promotion = Promotion::findOrFail($reward->promotion_id);
        $this->assertTrue($promotion->canUseBy($this->referrer->id));
        $this->assertFalse($promotion->canUseBy($this->referred->id));
        $data = ['business_id' => $booking->business_id, 'branch_id' => $booking->branch_id, 'service_id' => $booking->service_id, 'price' => 10000, 'date' => '2026-10-06', 'start_time' => '10:00', 'duration_minutes' => 60, 'participants' => 1, 'promo_code' => $promotion->promo_code];
        $pricing = app(AppointmentPricingService::class);
        $quote = $pricing->quote($data, $client->id);
        $this->assertSame(9000.0, $quote['total']);
        $benefitBooking = $booking->replicate(); $benefitBooking->client_id = $client->id; $benefitBooking->final_price = 9000; $benefitBooking->save();
        $pricing->redeem($quote, $benefitBooking->id, $client->id);
        $pricing->redeem($quote, $benefitBooking->id, $client->id);
        $this->assertSame(1, $promotion->fresh()->usage_count);
        $this->assertFalse($promotion->fresh()->canUseBy($this->referrer->id));
        $booking->update(['payment_status' => 'REFUND_PENDING']);
        $referrals->evaluate($attribution);
        $this->assertDatabaseHas('marketing.referral_attributions', ['id' => $attribution, 'status' => 'REVERSED']);
        $this->assertSame(2, DB::table('marketing.referral_rewards')->where('status', 'REVERSED')->count());
        $this->assertFalse($promotion->fresh()->is_active);
        $this->assertSame('9000.00', $benefitBooking->fresh()->final_price);
    }

    public function test_sandbox_payments_never_qualify_but_a_real_paid_completion_does(): void
    {
        $this->postJson('/api/v2/referrals/apply', ['code' => $this->code])->assertOk();
        $booking = $this->appointment();
        $this->program($booking->business_id); $this->payment($booking, 10000);
        $id = (string) Str::uuid();
        DB::table('finance.checkout_orders')->insert(['id' => $id, 'user_id' => $this->referred->id, 'idempotency_key' => (string) Str::uuid(), 'reference' => 'TEST-'.$id,
            'purpose' => 'reservation', 'target_id' => $booking->id, 'amount_in_cents' => 1000000, 'currency' => 'COP', 'environment' => 'test', 'status' => 'APPROVED', 'expires_at' => now()->addHour(), 'created_at' => now(), 'updated_at' => now()]);
        $attribution = DB::table('marketing.referral_attributions')->value('id');
        app(ReferralService::class)->evaluate($attribution);
        $this->assertDatabaseCount('marketing.referral_rewards', 0);
        $real = $booking->replicate(); $real->save(); $this->payment($real, 10000);
        app(ReferralService::class)->evaluate($attribution);
        $this->assertDatabaseCount('marketing.referral_rewards', 2);
        $this->assertDatabaseHas('marketing.referral_attributions', ['id' => $attribution, 'appointment_id' => $real->id]);
    }

    public function test_contact_preferences_are_opt_in_and_bound_to_authenticated_account(): void
    {
        $this->getJson('/api/v2/contact-preferences')->assertOk()->assertJsonPath('data.promotions_enabled', false);
        $this->putJson('/api/v2/contact-preferences', ['user_id' => $this->referrer->id, 'promotions_enabled' => true, 'timezone' => 'America/Bogota', 'contact_start' => '09:00', 'contact_end' => '18:00'])->assertOk();
        $this->assertDatabaseHas('marketing.contact_preferences', ['user_id' => $this->referred->id, 'promotions_enabled' => true]);
        $this->assertDatabaseMissing('marketing.contact_preferences', ['user_id' => $this->referrer->id]);
        $this->putJson('/api/v2/contact-preferences', ['promotions_enabled' => true, 'timezone' => 'America/Bogota', 'contact_start' => '18:00', 'contact_end' => '09:00'])->assertUnprocessable();
        $this->putJson('/api/v2/contact-preferences', ['promotions_enabled' => false, 'timezone' => 'America/Bogota', 'contact_start' => '09:00', 'contact_end' => '18:00'])->assertOk();
    }

    private function appointment(): Appointment
    {
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id, 'price' => 10000, 'duration_minutes' => 60]);
        $client = Client::factory()->create(['user_id' => $this->referred->id, 'business_id' => $business->id]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => $client->id,
            'date' => '2026-10-05', 'start_time' => '10:00', 'end_time' => '11:00', 'completed_at' => now(), 'status' => 'COMPLETED', 'price' => 10000, 'final_price' => 10000, 'currency' => 'COP', 'payment_status' => 'PAID', 'source' => 'app']);
    }

    private function payment(Appointment $booking, int $amount): void
    {
        DB::table('finance.payments')->insert(['business_id' => $booking->business_id, 'appointment_id' => $booking->id, 'client_id' => $booking->client_id, 'amount' => $amount, 'currency' => 'COP', 'method' => 'CASH', 'status' => 'COMPLETED', 'paid_at' => now()]);
    }

    private function program(int $businessId): void
    {
        DB::table('marketing.referral_programs')->insert(['business_id' => $businessId, 'enabled' => true, 'reward_minor' => 100000, 'minimum_paid_minor' => 1000000, 'currency' => 'COP', 'validity_days' => 30, 'qualification_days' => 30, 'terms' => 'Un uso por persona en el negocio, no transferible.', 'created_at' => now(), 'updated_at' => now()]);
    }
}
