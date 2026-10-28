<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Finance\Services\WithdrawalService;
use App\Modules\People\Models\Professional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WithdrawalLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_pending_withdrawal_is_distinct_from_transfer_and_cancellation_compensates_once(): void
    {
        $user = User::factory()->create(['role' => 'PROFESIONAL']);
        Professional::create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id, 'name' => 'Profesional', 'is_active' => true]);
        $wallet = app(WalletRepository::class)->getOrCreate($user->id);
        $wallet->credit('50000');
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/earnings/withdrawal', ['amount' => '15000.25', 'bank_name' => 'Banco', 'bank_account' => '123456789',
            'idempotency_key' => (string) Str::uuid()])->assertCreated()
            ->assertJsonPath('data.transfer_provider_enabled', false)->assertJsonPath('data.reserved_for_withdrawal', '15000.25')
            ->assertJsonPath('data.withdrawals.0.provider_confirmed', false)->assertJsonPath('data.withdrawals.0.bank_account_last4', '6789');
        $id = (int) DB::table('finance.withdrawals')->value('id');
        $service = app(WithdrawalService::class);
        $service->cancel($user->id, $id);
        $service->cancel($user->id, $id);
        $this->assertSame('50000.00', $wallet->fresh()->balance);
        $this->assertSame(1, $wallet->transactions()->where('source_type', 'WITHDRAWAL_REVERSAL')->count());
        $this->assertSame(1, $wallet->transactions()->where('source_type', 'WITHDRAWAL')->count());
        $this->assertSame('CANCELLED', DB::table('finance.withdrawals')->value('status'));
        $this->assertSame('0.00', $service->summary($user->id)['reserved_for_withdrawal']);
        $this->assertNull(DB::table('finance.withdrawals')->value('processed_at'));
        $this->assertSame(2, DB::table('platform.marketplace_outbox')->where('event', 'payout.updated')->count());
        $this->assertSame(0, DB::table('platform.marketplace_outbox')->where('event', 'payout.updated')->whereNotNull('business_id')->count());
    }
}
