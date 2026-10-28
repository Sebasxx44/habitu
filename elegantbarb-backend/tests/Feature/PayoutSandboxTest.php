<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Services\PayoutSandboxService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PayoutSandboxTest extends TestCase
{
    use RefreshDatabase;
    private User $actor;
    private int $withdrawalId;
    private string $bankId;
    private string $sourceId;
    private string $batchId;
    private string $transactionId;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        $this->actor = User::factory()->create(['role' => 'SUPERADMIN']);
        $client = User::factory()->create(['name' => 'Private Real Person', 'email' => 'private@example.com']);
        $this->withdrawalId = DB::table('finance.withdrawals')->insertGetId(['user_id' => $client->id, 'amount' => '15000.25', 'bank_name' => 'PrivateBank', 'bank_account' => '777888999000', 'status' => 'PENDING', 'created_at' => now(), 'updated_at' => now()]);
        $this->bankId = (string) Str::uuid(); $this->sourceId = (string) Str::uuid(); $this->batchId = (string) Str::uuid(); $this->transactionId = (string) Str::uuid();
        config(['payouts.sandbox_enabled' => true, 'payouts.api_key' => 'test-api-key', 'payouts.principal_id' => 'test-principal',
            'payouts.source_account_id' => $this->sourceId, 'payouts.test_bank_id' => $this->bankId]);
        Sanctum::actingAs($this->actor);
        $this->fake();
    }

    private function fake(string $outcome = 'accepted', ?object $attempt = null, string $lookup = 'absent', bool $activeSource = true): void
    {
        Http::swap(new Factory()); Http::preventStrayRequests();
        Http::fake(function ($request) use ($outcome, $attempt, $lookup, $activeSource) {
            $this->assertSame('api.sandbox.payouts.wompi.co', parse_url($request->url(), PHP_URL_HOST));
            $this->assertSame(['test-api-key'], $request->header('x-api-key'));
            $path = parse_url($request->url(), PHP_URL_PATH);
            if ($path === '/v1/accounts') return Http::response(['data' => [['id' => $this->sourceId, 'status' => $activeSource ? 'ACTIVE' : 'INACTIVE', 'balanceInCents' => 9000000]]]);
            if ($path === '/v1/banks') return Http::response([['id' => $this->bankId, 'code' => 'TEST_BANK', 'name' => 'Test Bank']]);
            if ($request->method() === 'POST') {
                $this->assertSame('/v1/payouts', $path);
                if ($outcome === 'timeout') throw new ConnectionException('PRIVATE RESPONSE SHOULD NOT BE LOGGED');
                return Http::response(['data' => ['payoutId' => $this->batchId, 'transactions' => 1, 'success' => 1, 'failed' => 0]], 201);
            }
            if ($lookup === 'unavailable') return Http::response([], 503);
            if ($lookup === 'malformed') return Http::response(['data' => ['total' => 1, 'records' => ['not-a-list' => ['status' => ['bad']]]]]);
            if ($lookup === 'absent') return Http::response(['data' => ['total' => 0, 'records' => [], 'page' => 1, 'pages' => 0]]);
            if ($path === '/v1/payouts') return Http::response(['data' => ['total' => 1, 'records' => [['id' => $this->batchId, 'reference' => $attempt->reference, 'amountInCents' => 1500025, 'totalTransactions' => 1, 'status' => 'TOTAL_PAYMENT']]]]);
            $payload = json_decode(Crypt::decryptString($attempt->encrypted_payload), true)['request']['transactions'][0];
            $payee = array_intersect_key($payload, array_flip(['legalIdType', 'legalId', 'name', 'email', 'accountType', 'accountNumber'])) + ['bankCode' => 'TEST_BANK'];
            if ($lookup === 'mismatch') $payee['accountNumber'] = '12345679';
            return Http::response(['data' => ['total' => 1, 'records' => [['id' => $this->transactionId, 'reference' => $attempt->reference,
                'amountInCents' => 1500025, 'status' => 'APPROVED', 'payeeInfo' => $payee]]]]);
        });
    }

    private function prepare(): object
    {
        return app(PayoutSandboxService::class)->prepare($this->withdrawalId, $this->actor->id);
    }

    private function posts(): int
    {
        return Http::recorded(fn ($request) => $request->method() === 'POST')->count();
    }

    public function test_api_is_superadmin_only_and_disabled_configuration_makes_no_external_calls(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/v2/payout-sandbox')->assertForbidden();
        $this->postJson('/api/v2/payout-sandbox/withdrawals/'.$this->withdrawalId.'/prepare', ['sandbox_acknowledged' => true])->assertForbidden();
        Sanctum::actingAs($this->actor);
        config(['payouts.sandbox_enabled' => false]);
        $this->getJson('/api/v2/payout-sandbox')->assertOk()->assertJsonPath('data.commercial_enabled', false)->assertJsonPath('data.sandbox_enabled', false);
        $this->postJson('/api/v2/payout-sandbox/withdrawals/'.$this->withdrawalId.'/prepare', ['sandbox_acknowledged' => true])->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_prepare_validates_source_and_uses_encrypted_synthetic_recipient_with_stable_idempotency(): void
    {
        $attempt = $this->prepare();
        $this->assertSame($attempt->id, $this->prepare()->id);
        $payload = json_decode(Crypt::decryptString($attempt->encrypted_payload), true)['request'];
        $this->assertSame(1500025, $payload['transactions'][0]['amount']);
        $this->assertSame('Habitu Sandbox', $payload['transactions'][0]['name']);
        $this->assertSame('12345678', $payload['transactions'][0]['accountNumber']);
        $this->assertStringNotContainsString('Private', $attempt->encrypted_payload);
        $this->assertStringNotContainsString('777888999000', json_encode($payload));
        $this->assertSame(0, $this->posts());
        $this->assertSame(1, DB::table('finance.payout_sandbox_attempts')->count());
    }

    public function test_post_response_never_confirms_transfer_and_private_lookup_is_idempotent(): void
    {
        $attempt = $this->prepare();
        $service = app(PayoutSandboxService::class);
        $this->assertSame('PROCESSING', $service->submit($attempt->id, $this->actor->id)->state);
        Http::assertSent(fn ($request) => $request->method() === 'POST' && $request->hasHeader('idempotency-key', $attempt->id));
        $this->fake(attempt: $attempt, lookup: 'approved');
        $this->assertSame('APPROVED', $service->submit($attempt->id, $this->actor->id)->state);
        $this->assertSame('APPROVED', $service->submit($attempt->id, $this->actor->id)->state);
        $this->assertSame(0, $this->posts());
        $this->assertDatabaseHas('finance.withdrawals', ['id' => $this->withdrawalId, 'status' => 'PENDING', 'processed_at' => null]);
        $this->assertSame(0, DB::table('finance.wallet_transactions')->count());
        $this->postJson('/api/v2/payout-sandbox/attempts/'.$attempt->id.'/submit', ['sandbox_acknowledged' => true, 'status' => 'COMPLETED'])->assertUnprocessable();
    }

    public function test_uncertain_attempt_queries_before_same_key_retry_and_never_retries_if_lookup_fails(): void
    {
        $attempt = $this->prepare(); $service = app(PayoutSandboxService::class);
        $this->fake('timeout');
        $this->assertSame('UNCERTAIN', $service->submit($attempt->id, $this->actor->id)->state);
        $this->travel(2)->minutes();
        $this->fake(lookup: 'unavailable');
        $this->assertSame('UNCERTAIN', $service->submit($attempt->id, $this->actor->id)->state);
        $this->assertSame(0, $this->posts());
        $this->fake();
        $this->assertSame('PROCESSING', $service->submit($attempt->id, $this->actor->id)->state);
        $recorded = Http::recorded();
        $this->assertSame('GET', $recorded[0][0]->method());
        $this->assertSame('GET', $recorded[1][0]->method());
        $this->assertSame('POST', $recorded[2][0]->method());
        $this->assertSame([$attempt->id], $recorded[2][0]->header('idempotency-key'));
    }

    public function test_expired_idempotency_window_blocks_resending_even_if_provider_returns_empty(): void
    {
        $attempt = $this->prepare(); $service = app(PayoutSandboxService::class);
        $this->fake('timeout'); $service->submit($attempt->id, $this->actor->id);
        $this->travel(25)->hours(); $this->fake();
        $result = $service->submit($attempt->id, $this->actor->id);
        $this->assertSame('REVIEW', $result->state);
        $this->assertSame('IDEMPOTENCY_WINDOW_EXPIRED', $result->resolution);
        $this->assertSame(0, $this->posts());
    }

    public function test_mismatched_recipient_requires_review_without_finalizing_real_withdrawal(): void
    {
        $attempt = $this->prepare(); $service = app(PayoutSandboxService::class);
        $service->submit($attempt->id, $this->actor->id);
        $this->fake(attempt: $attempt, lookup: 'mismatch');
        $this->assertSame('REVIEW', $service->reconcile($attempt->id, $this->actor->id)['attempt']->state);
        $this->assertDatabaseHas('finance.withdrawals', ['id' => $this->withdrawalId, 'status' => 'PENDING']);
        $this->assertSame(0, $this->posts());
    }

    public function test_malformed_response_and_disappearing_known_batch_block_resending(): void
    {
        $attempt = $this->prepare(); $service = app(PayoutSandboxService::class);
        $service->submit($attempt->id, $this->actor->id);
        $this->fake(lookup: 'malformed');
        $this->assertSame('REVIEW', $service->reconcile($attempt->id, $this->actor->id)['attempt']->state);
        $this->fake(); $this->travel(2)->minutes();
        $result = $service->submit($attempt->id, $this->actor->id);
        $this->assertSame('REVIEW', $result->state);
        $this->assertSame('KNOWN_OR_REVIEWED_PAYOUT_MISSING', $result->resolution);
        $this->assertSame(0, $this->posts());
    }

    public function test_changed_principal_cannot_send_snapshot_to_another_account(): void
    {
        $attempt = $this->prepare();
        config(['payouts.principal_id' => 'changed-principal']);
        Http::swap(new Factory()); Http::preventStrayRequests();
        $this->postJson('/api/v2/payout-sandbox/attempts/'.$attempt->id.'/submit', ['sandbox_acknowledged' => true])->assertConflict();
        Http::assertNothingSent();
    }

    public function test_inactive_source_cannot_prepare_and_cancelled_withdrawal_cannot_send(): void
    {
        $this->fake(activeSource: false);
        $this->postJson('/api/v2/payout-sandbox/withdrawals/'.$this->withdrawalId.'/prepare', ['sandbox_acknowledged' => true])->assertUnprocessable();
        $this->assertSame(0, DB::table('finance.payout_sandbox_attempts')->count());
        $this->fake(); $attempt = $this->prepare();
        DB::table('finance.withdrawals')->where('id', $this->withdrawalId)->update(['status' => 'CANCELLED']);
        $this->postJson('/api/v2/payout-sandbox/attempts/'.$attempt->id.'/submit', ['sandbox_acknowledged' => true])->assertConflict();
        $this->assertSame(0, $this->posts());
    }
}
