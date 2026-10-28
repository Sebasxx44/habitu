<?php

namespace Tests\Feature;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Finance\Services\PaymentReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WalletIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_wallet_instances_cannot_overwrite_debits_or_overspend(): void
    {
        $wallet = app(WalletRepository::class)->getOrCreate(User::factory()->create()->id);
        $wallet->credit('100.00');
        $stale = Wallet::findOrFail($wallet->id);
        $wallet->debit('60.00');
        try {
            $stale->debit('60.00');
            $this->fail('A stale balance must not authorize a second debit.');
        } catch (\InvalidArgumentException $exception) {
            $this->assertSame('Saldo disponible insuficiente.', $exception->getMessage());
        }
        $this->assertSame('40.00', $wallet->fresh()->balance);
        $this->assertSame(2, $wallet->transactions()->count());
    }

    public function test_money_arithmetic_and_duplicate_references_are_exact(): void
    {
        $wallet = app(WalletRepository::class)->getOrCreate(User::factory()->create()->id);
        $wallet->credit('0.10', ['external_reference' => 'ref-1']);
        $wallet->credit('0.10', ['external_reference' => 'ref-1']);
        $wallet->credit('0.20', ['external_reference' => 'ref-2']);
        $this->assertSame('0.30', $wallet->fresh()->balance);
        $this->assertSame(2, $wallet->transactions()->count());
        $this->expectException(\InvalidArgumentException::class);
        Money::minor('0.001');
    }

    public function test_funds_on_hold_cannot_be_spent(): void
    {
        $wallet = app(WalletRepository::class)->getOrCreate(User::factory()->create()->id);
        $wallet->credit('100');
        $wallet->update(['hold_balance' => '80']);
        $this->expectException(\InvalidArgumentException::class);
        $wallet->debit('21');
    }

    public function test_client_cannot_credit_wallet_without_verified_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/wallet/topup', ['amount' => 50000])->assertForbidden();
        $this->assertSame(0, DB::table('finance.wallet_transactions')->count());
    }

    public function test_payment_webhook_replay_is_idempotent_and_ledger_is_complete(): void
    {
        $user = User::factory()->create();
        DB::table('finance.wallet_topups')->insert(['user_id' => $user->id, 'amount' => '5000.25', 'external_reference' => 'WALLET-TOPUP-test', 'status' => 'PENDING']);
        $payment = ['payment_id' => '123', 'external_reference' => 'WALLET-TOPUP-test', 'amount' => '5000.25', 'currency' => 'COP', 'status' => 'approved'];
        $reconciler = app(PaymentReconciliationService::class);
        $this->assertTrue($reconciler->reconcile($payment)->success);
        $this->assertTrue($reconciler->reconcile($payment)->success);
        $this->assertSame('5000.25', Wallet::where('user_id', $user->id)->firstOrFail()->balance);
        $this->assertDatabaseHas('finance.wallet_transactions', ['user_id' => $user->id, 'balance_before' => '0.00', 'balance_after' => '5000.25', 'source_type' => 'WALLET_TOPUP']);
        $this->assertSame(1, DB::table('finance.wallet_transactions')->count());
    }

    public function test_gateway_amount_mismatch_does_not_credit_wallet(): void
    {
        $user = User::factory()->create();
        DB::table('finance.wallet_topups')->insert(['user_id' => $user->id, 'amount' => '5000', 'external_reference' => 'WALLET-TOPUP-test', 'status' => 'PENDING']);
        $response = app(PaymentReconciliationService::class)->reconcile(['payment_id' => '123', 'external_reference' => 'WALLET-TOPUP-test', 'amount' => '1', 'currency' => 'COP', 'status' => 'approved']);
        $this->assertSame(422, $response->statusCode);
        $this->assertSame(0, DB::table('finance.wallet_transactions')->count());
        $this->assertDatabaseHas('finance.wallet_topups', ['external_reference' => 'WALLET-TOPUP-test', 'status' => 'PENDING']);
    }
    public function test_daily_settlement_can_be_retried_without_duplicating_payouts(): void
    {
        $user = User::factory()->create();
        $business = \App\Modules\Business\Models\Business::factory()->create();
        $professional = \App\Modules\People\Models\Professional::create([
            'user_id' => $user->id, 'business_id' => $business->id, 'name' => 'Profesional', 'is_active' => true,
        ]);
        \App\Modules\OnDemand\Models\OnDemandRequest::factory()->create([
            'status' => 'COMPLETED', 'professional_id' => $professional->id,
            'final_price' => '100.01', 'completed_at' => now(),
        ]);
        $this->artisan('wallet:daily-settlement')->assertSuccessful();
        $this->artisan('wallet:daily-settlement')->assertSuccessful();
        $this->assertSame('85.01', Wallet::where('user_id', $user->id)->firstOrFail()->balance);
        $this->assertSame(1, DB::table('finance.wallet_transactions')->where('user_id', $user->id)->count());
    }

    public function test_withdrawal_replay_creates_one_request_and_one_debit(): void
    {
        $wallet = $this->professionalWallet();
        $request = ['amount' => '15000.25', 'bank_account' => '12345', 'bank_name' => 'Banco', 'idempotency_key' => (string) \Illuminate\Support\Str::uuid()];
        $this->postJson('/api/v2/earnings/withdrawal', $request)->assertCreated();
        $this->postJson('/api/v2/earnings/withdrawal', $request)->assertCreated();
        $this->assertSame('34999.75', $wallet->fresh()->balance);
        $this->assertSame(1, DB::table('finance.withdrawals')->count());
        $this->assertSame(1, $wallet->transactions()->where('source_type', 'WITHDRAWAL')->count());
        $this->postJson('/api/v2/earnings/withdrawal', array_replace($request, ['amount' => '18000.25']))->assertUnprocessable();
        $this->assertSame('34999.75', $wallet->fresh()->balance);
    }

    public function test_withdrawal_cannot_spend_held_funds_or_leave_partial_request(): void
    {
        $wallet = $this->professionalWallet();
        $wallet->update(['hold_balance' => '45000']);
        $this->postJson('/api/v2/earnings/withdrawal', [
            'amount' => '15000', 'bank_account' => '12345', 'bank_name' => 'Banco',
            'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
        ])->assertUnprocessable();
        $this->assertSame('50000.00', $wallet->fresh()->balance);
        $this->assertSame(0, DB::table('finance.withdrawals')->count());
    }

    public function test_withdrawal_requires_professional_profile(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/earnings/withdrawal', [
            'amount' => '15000', 'bank_account' => '12345', 'bank_name' => 'Banco',
            'idempotency_key' => (string) \Illuminate\Support\Str::uuid(),
        ])->assertForbidden();
        $this->assertSame(0, DB::table('finance.withdrawals')->count());
    }

    public function test_automatic_renewals_cannot_spend_frozen_or_held_funds(): void
    {
        $plan = \App\Modules\Subscriptions\Models\Plan::create(['name' => 'Renewal', 'slug' => (string) \Illuminate\Support\Str::uuid(), 'price' => '5000.25', 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'credits_per_cycle' => 3, 'is_active' => true]);
        foreach ([false, true] as $active) {
            $user = User::factory()->create();
            $wallet = app(WalletRepository::class)->getOrCreate($user->id);
            $wallet->credit('10000');
            $wallet->update(['is_active' => $active, 'hold_balance' => $active ? '9000' : '0']);
            $subscription = \App\Modules\Subscriptions\Models\UserSubscription::create(['user_id' => $user->id, 'plan_id' => $plan->id, 'status' => 'ACTIVE', 'starts_at' => now()->subMonth(), 'ends_at' => now()->addHour(), 'auto_renew' => true, 'credits_remaining' => 1]);
            $this->artisan('subscriptions:process-renewals')->assertSuccessful();
            $this->artisan('subscriptions:process-renewals')->assertSuccessful();
            $this->assertSame('PENDING_PAYMENT', $subscription->fresh()->status);
            $this->assertSame('10000.00', $wallet->fresh()->balance);
            $this->assertSame(0, $wallet->transactions()->where('type', 'DEBIT')->count());
            $this->assertSame(1, \App\Models\Notification::where('user_id', $user->id)->where('type', 'SUBSCRIPTION_RENEWAL_FAILED')->count());
        }
    }

    public function test_automatic_renewal_uses_exact_ledger_once_per_period(): void
    {
        $user = User::factory()->create();
        $plan = \App\Modules\Subscriptions\Models\Plan::create(['name' => 'Renewal', 'slug' => (string) \Illuminate\Support\Str::uuid(), 'price' => '5000.25', 'currency' => 'COP', 'billing_cycle' => 'MONTHLY', 'credits_per_cycle' => 3, 'is_active' => true]);
        $wallet = app(WalletRepository::class)->getOrCreate($user->id);
        $wallet->credit('10000');
        $period = now()->addHour()->startOfSecond();
        $subscription = \App\Modules\Subscriptions\Models\UserSubscription::create(['user_id' => $user->id, 'plan_id' => $plan->id, 'status' => 'ACTIVE', 'starts_at' => now()->subMonth(), 'ends_at' => $period, 'auto_renew' => true, 'credits_remaining' => 1]);
        $this->artisan('subscriptions:process-renewals')->assertSuccessful();
        $this->artisan('subscriptions:process-renewals')->assertSuccessful();
        $this->assertSame('4999.75', $wallet->fresh()->balance);
        $this->assertSame(1, $wallet->transactions()->where('type', 'DEBIT')->count());
        $this->assertSame('5000.25', $wallet->transactions()->where('type', 'DEBIT')->firstOrFail()->amount);
        $this->assertTrue($period->copy()->addMonthNoOverflow()->eq($subscription->fresh()->ends_at));
        $this->assertSame(3, $subscription->fresh()->credits_remaining);
    }

    private function professionalWallet(): Wallet
    {
        $user = User::factory()->create(['role' => 'PROFESSIONAL']);
        \App\Modules\People\Models\Professional::create([
            'user_id' => $user->id, 'business_id' => \App\Modules\Business\Models\Business::factory()->create()->id,
            'name' => 'Profesional', 'is_active' => true,
        ]);
        Sanctum::actingAs($user);
        $wallet = app(WalletRepository::class)->getOrCreate($user->id);
        $wallet->credit('50000');
        return $wallet;
    }

}
