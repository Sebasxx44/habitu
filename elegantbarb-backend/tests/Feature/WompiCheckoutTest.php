<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Finance\Models\CheckoutOrder;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Services\WompiGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WompiCheckoutTest extends TestCase
{
    use RefreshDatabase;
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.wompi.environment'=>'test', 'services.wompi.public_key'=>'pub_test_local', 'services.wompi.private_key'=>'prv_test_local',
            'services.wompi.integrity_secret'=>'test_integrity_local', 'services.wompi.events_secret'=>'test_events_local', 'services.wompi.frontend_url'=>'https://habitu.test']);
        Http::preventStrayRequests();
    }
    private function order(): array
    {
        $user = User::factory()->create(['role'=>'CLIENTE']); Sanctum::actingAs($user);
        $payload = ['amount'=>'5000.25','idempotency_key'=>(string) Str::uuid()];
        $response = $this->postJson('/api/v2/wompi/wallet', $payload)->assertOk()->assertJsonPath('data.status','PENDING');
        return [$user, CheckoutOrder::findOrFail($response->json('data.id')), $payload];
    }
    private function event(array $transaction): array
    {
        $properties = ['transaction.amount_in_cents','transaction.id','transaction.status'];
        $time = time(); $checksum = hash('sha256', $transaction['amount_in_cents'].$transaction['id'].$transaction['status'].$time.'test_events_local');
        return ['event'=>'transaction.updated','environment'=>'test','timestamp'=>$time,'data'=>['transaction'=>$transaction], 'signature'=>['properties'=>$properties,'checksum'=>strtoupper($checksum)]];
    }
    private function payment(CheckoutOrder $order, string $status = 'APPROVED'): array
    {
        return ['id'=>'test-transaction-123','reference'=>$order->reference,'amount_in_cents'=>$order->amount_in_cents,'currency'=>'COP','status'=>$status,'payment_method_type'=>'NEQUI'];
    }
    public function test_checkout_is_idempotent_server_signed_and_does_not_credit_from_redirect(): void
    {
        [$user,$order,$payload] = $this->order();
        $this->postJson('/api/v2/wompi/wallet',$payload)->assertOk()->assertJsonPath('data.id',$order->id);
        $this->postJson('/api/v2/wompi/wallet',array_replace($payload,['amount'=>'6000.25']))->assertUnprocessable();
        $this->assertSame(1,CheckoutOrder::count());
        parse_str(parse_url(app(WompiGateway::class)->checkoutUrl($order),PHP_URL_QUERY),$query);
        $this->assertSame('500025',$query['amount-in-cents']);
        $this->assertSame(hash('sha256',$order->reference.'500025COP'.$query['expiration-time'].'test_integrity_local'),$query['signature:integrity']);
        $this->assertStringContainsString('/cliente/wallet?checkout='.$order->id,$query['redirect-url']);
        $this->getJson('/api/v2/wompi/orders/'.$order->id.'?status=APPROVED&id=test-transaction-123')->assertOk()->assertJsonPath('data.status','PENDING');
        $this->assertSame('0.00',Wallet::where('user_id',$user->id)->firstOrFail()->balance);
        Http::assertNothingSent();
    }
    public function test_signed_webhook_and_private_api_credit_exactly_once_and_never_regress_on_replay(): void
    {
        [$user,$order] = $this->order(); $payment = $this->payment($order);
        Http::fake(['sandbox.wompi.co/v1/transactions/*'=>Http::sequence()->push(['data'=>$payment])->push(['data'=>$payment])->push(['data'=>$this->payment($order,'PENDING')])->push(['data'=>$this->payment($order,'VOIDED')])]);
        $event=$this->event($payment);
        $this->postJson('/api/v2/webhooks/wompi',$event)->assertOk();
        $this->postJson('/api/v2/webhooks/wompi',$event)->assertOk();
        $this->assertSame('5000.25',Wallet::where('user_id',$user->id)->firstOrFail()->balance);
        $this->assertSame(1,DB::table('finance.wallet_transactions')->where('user_id',$user->id)->count());
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization','Bearer prv_test_local'));
        $this->postJson('/api/v2/webhooks/wompi',$this->event($this->payment($order,'PENDING')))->assertOk();
        $this->assertSame('APPROVED',$order->fresh()->status);
        $this->postJson('/api/v2/webhooks/wompi',$this->event($this->payment($order,'VOIDED')))->assertOk();
        $this->assertSame('REVIEW',$order->fresh()->status);
        $wallet = Wallet::where('user_id',$user->id)->firstOrFail();
        $this->assertSame('5000.25', $wallet->balance);
        $this->assertSame('5000.25', $wallet->hold_balance);
        $this->assertFalse($wallet->is_active);
    }
    public function test_widget_options_share_the_server_signature_without_exposing_secrets(): void
    {
        [, $order] = $this->order();
        $response = $this->getJson('/api/v2/wompi/orders/'.$order->id)->assertOk()
            ->assertJsonPath('data.checkout_options.publicKey', 'pub_test_local')
            ->assertJsonPath('data.checkout_options.amountInCents', 500025)
            ->assertJsonPath('data.checkout_options.currency', 'COP');
        $options = $response->json('data.checkout_options');
        parse_str(parse_url($response->json('data.checkout_url'), PHP_URL_QUERY), $query);
        $this->assertSame($query['signature:integrity'], $options['signature']['integrity']);
        $this->assertSame($query['expiration-time'], $options['expirationTime']);
        $this->assertSame($query['redirect-url'], $options['redirectUrl']);
        foreach (['prv_test_local', 'test_integrity_local', 'test_events_local'] as $secret) {
            $this->assertStringNotContainsString($secret, $response->getContent());
        }
        $order->update(['expires_at' => now()->subMinute()]);
        $this->getJson('/api/v2/wompi/orders/'.$order->id)->assertOk()
            ->assertJsonPath('data.checkout_options', null)->assertJsonPath('data.checkout_url', null);
    }

    public function test_mixed_secrets_and_insecure_production_redirect_disable_checkout(): void
    {
        $gateway = app(WompiGateway::class);
        $this->assertTrue($gateway->enabled());
        config(['services.wompi.integrity_secret' => 'test_events_local']);
        $this->assertFalse($gateway->enabled());
        config(['services.wompi.integrity_secret' => 'test_integrity_']);
        $this->assertFalse($gateway->enabled());
        config(['services.wompi.environment' => 'prod', 'services.wompi.public_key' => 'pub_prod_local',
            'services.wompi.private_key' => 'prv_prod_local', 'services.wompi.integrity_secret' => 'prod_integrity_local',
            'services.wompi.events_secret' => 'prod_events_local', 'services.wompi.frontend_url' => 'http://habitu.test']);
        $this->assertFalse($gateway->enabled());
        config(['services.wompi.frontend_url' => 'https://habitu.test']);
        $this->assertTrue($gateway->enabled());
        config(['services.wompi.frontend_url' => 'https://user:password@habitu.test']);
        $this->assertFalse($gateway->enabled());
        Http::assertNothingSent();
    }
    public function test_untrusted_events_and_amount_mismatch_cannot_credit_any_wallet(): void
    {
        [, $order] = $this->order(); $payment = $this->payment($order); $event = $this->event($payment);
        $invalid=$event; $invalid['signature']['checksum']=str_repeat('0',64);
        $this->postJson('/api/v2/webhooks/wompi',$invalid)->assertUnauthorized();
        $invalid=$event; $invalid['environment']='prod';
        $this->postJson('/api/v2/webhooks/wompi',$invalid)->assertStatus(400);
        Http::assertNothingSent();
        // An attacker cannot change an unsigned reference to select a different order:
        // the reference, amount and currency are obtained from the authenticated API.
        $wrong = array_replace($payment,['amount_in_cents'=>100]);
        Http::fake(['sandbox.wompi.co/v1/transactions/*'=>Http::response(['data'=>$wrong])]);
        $this->postJson('/api/v2/webhooks/wompi',$event)->assertUnprocessable();
        $this->assertSame(0,DB::table('finance.wallet_transactions')->count());
        $this->assertSame('PENDING',$order->fresh()->status);
    }
    public function test_other_users_cannot_read_orders_and_disabled_gateway_never_creates_an_order(): void
    {
        [, $order] = $this->order(); Sanctum::actingAs(User::factory()->create(['role'=>'CLIENTE']));
        $this->getJson('/api/v2/wompi/orders/'.$order->id)->assertNotFound();
        $this->getJson('/api/v2/wompi/orders')->assertOk()->assertJsonCount(0,'data');
        config(['services.wompi.private_key'=>null]);
        $this->getJson('/api/v2/wompi/config')->assertOk()->assertJsonPath('data.enabled',false);
        $this->postJson('/api/v2/wompi/wallet',['amount'=>5000,'idempotency_key'=>(string)Str::uuid()])->assertStatus(503);
        $this->assertSame(1,CheckoutOrder::count());
    }
    public function test_declined_and_failed_requests_leave_balance_unchanged_and_history_filters_are_scoped(): void
    {
        [$user,$order]=$this->order(); $payment=$this->payment($order,'DECLINED');
        Http::fake(['sandbox.wompi.co/v1/transactions/*'=>Http::response(['data'=>$payment])]);
        $this->postJson('/api/v2/webhooks/wompi',$this->event($payment))->assertOk();
        $this->assertSame('DECLINED',$order->fresh()->status);
        $wallet=Wallet::where('user_id',$user->id)->firstOrFail(); $wallet->credit('10000'); $wallet->debit('500');
        $this->getJson('/api/v2/wallet/transactions?type=DEBIT')->assertOk()->assertJsonPath('data.total',1)->assertJsonPath('data.data.0.amount','500.00');
        $this->getJson('/api/v2/wallet/transactions?type=INVALID')->assertUnprocessable();
        $this->getJson('/api/v2/wallet/transactions?from=2026-10-05&to=2026-10-01')->assertUnprocessable();
    }
    public function test_checkout_retry_accepts_a_new_verified_transaction_and_ignores_old_attempts(): void
    {
        [$user, $order] = $this->order();
        $declined = $this->payment($order, 'DECLINED');
        $approved = array_replace($this->payment($order), ['id' => 'test-retry-456', 'payment_method_type' => 'PSE']);
        $unrelatedVoid = $this->payment($order, 'VOIDED');
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()->push(['data' => $declined])->push(['data' => $approved])->push(['data' => $declined])->push(['data' => $unrelatedVoid])->push(['data' => $approved])]);
        $this->postJson('/api/v2/webhooks/wompi', $this->event($declined))->assertOk();
        $this->assertNull($order->fresh()->provider_transaction_id);
        foreach ([$approved, $declined, $unrelatedVoid, $approved] as $payment) $this->postJson('/api/v2/webhooks/wompi', $this->event($payment))->assertOk();
        $this->assertSame('APPROVED', $order->fresh()->status);
        $this->assertSame('test-retry-456', $order->fresh()->provider_transaction_id);
        $wallet = Wallet::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('5000.25', $wallet->balance);
        $this->assertSame('0.00', $wallet->hold_balance);
        $this->assertTrue($wallet->is_active);
        $this->assertSame(1, $wallet->transactions()->count());
    }

    public function test_void_freezes_funds_once_but_later_verified_incoming_payments_still_record(): void
    {
        [$user, $order] = $this->order();
        $secondResponse = $this->postJson('/api/v2/wompi/wallet', ['amount' => '6000.00', 'idempotency_key' => (string) Str::uuid()])->assertOk();
        $second = CheckoutOrder::findOrFail($secondResponse->json('data.id'));
        $approved = $this->payment($order);
        $voided = $this->payment($order, 'VOIDED');
        $later = array_replace($this->payment($second), ['id' => 'test-next-789']);
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()->push(['data' => $approved])->push(['data' => $voided])->push(['data' => $voided])->push(['data' => $later])->push(['data' => $later])]);
        foreach ([$approved, $voided, $voided, $later, $later] as $payment) $this->postJson('/api/v2/webhooks/wompi', $this->event($payment))->assertOk();
        $wallet = Wallet::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('11000.25', $wallet->balance);
        $this->assertSame('5000.25', $wallet->hold_balance);
        $this->assertFalse($wallet->is_active);
        $this->assertSame(2, $wallet->transactions()->count());
        $this->assertSame('0.00', $order->fresh()->metadata['void_review']['uncovered_amount']);
        $this->assertSame('APPROVED', $second->fresh()->status);
        $this->postJson('/api/v2/wompi/wallet', ['amount' => '5000', 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        // Even the new, valid credit remains unavailable until manual review resolves the freeze.
        $this->expectException(\InvalidArgumentException::class);
        $wallet->debit('1');
    }

    public function test_void_after_partial_spending_preserves_ledger_records_deficit_and_blocks_withdrawal(): void
    {
        [$user, $order] = $this->order();
        $approved = $this->payment($order);
        $voided = $this->payment($order, 'VOIDED');
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()->push(['data' => $approved])->push(['data' => $voided])->push(['data' => $voided])]);
        $this->postJson('/api/v2/webhooks/wompi', $this->event($approved))->assertOk();
        $wallet = Wallet::where('user_id', $user->id)->firstOrFail();
        $wallet->debit('4000');
        $wallet->update(['hold_balance' => '500.00']);
        $this->postJson('/api/v2/webhooks/wompi', $this->event($voided))->assertOk();
        $this->postJson('/api/v2/webhooks/wompi', $this->event($voided))->assertOk();
        $this->assertSame('1000.25', $wallet->fresh()->balance);
        $this->assertSame('1000.25', $wallet->fresh()->hold_balance);
        $this->assertSame('500.25', $order->fresh()->metadata['void_review']['held_amount']);
        $this->assertSame('4500.00', $order->fresh()->metadata['void_review']['uncovered_amount']);
        $this->assertFalse($wallet->fresh()->is_active);
        $this->assertSame(2, $wallet->transactions()->count());
        $wallet->refund('20000', ['external_reference' => 'refund-after-freeze']);
        $this->assertSame('21000.25', $wallet->fresh()->balance);
        $this->assertFalse($wallet->fresh()->is_active);
        $user->update(['role' => 'PROFESSIONAL']);
        \App\Modules\People\Models\Professional::create(['user_id' => $user->id, 'business_id' => \App\Modules\Business\Models\Business::factory()->create()->id, 'name' => 'Professional', 'is_active' => true]);
        Sanctum::actingAs($user->fresh());
        $this->postJson('/api/v2/earnings/withdrawal', ['amount' => '10000', 'bank_account' => '12345', 'bank_name' => 'Banco', 'idempotency_key' => (string) Str::uuid()])->assertUnprocessable();
        $this->assertSame(0, DB::table('finance.withdrawals')->where('user_id', $user->id)->count());
        $this->assertSame('21000.25', $wallet->fresh()->balance);
    }

    public function test_reconciliation_recovers_a_wallet_payment_without_a_webhook_and_stays_idempotent(): void
    {
        [$user, $order] = $this->order();
        $payment = $this->payment($order);
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::response(['data' => $payment])]);
        foreach ([1, 2] as $attempt) {
            $this->postJson('/api/v2/wompi/orders/'.$order->id.'/reconcile', ['transaction_id' => $payment['id']])
                ->assertOk()->assertJsonPath('data.status', 'APPROVED')->assertJsonPath('data.checkout_url', null);
        }
        $this->assertSame('5000.25', Wallet::where('user_id', $user->id)->firstOrFail()->balance);
        $this->assertSame(1, DB::table('finance.wallet_transactions')->where('user_id', $user->id)->count());
    }

    public function test_reconciliation_rejects_another_orders_payment_and_connection_failures_preserve_pending_state(): void
    {
        [$user, $order] = $this->order();
        $payment = array_replace($this->payment($order), ['reference' => 'HABITU-another-order']);
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::sequence()
            ->push(['data' => $payment])->pushResponse(Http::failedConnection())]);
        $this->postJson('/api/v2/wompi/orders/'.$order->id.'/reconcile', ['transaction_id' => $payment['id']])->assertUnprocessable();
        $this->postJson('/api/v2/wompi/orders/'.$order->id.'/reconcile', ['transaction_id' => $payment['id']])->assertStatus(503);
        $this->assertSame('PENDING', $order->fresh()->status);
        $this->assertNull($order->fresh()->credited_at);
        $this->assertSame('0.00', Wallet::where('user_id', $user->id)->firstOrFail()->balance);
    }

    public function test_malformed_provider_payload_cannot_be_applied_or_credit_the_wallet(): void
    {
        [$user, $order] = $this->order();
        $payment = $this->payment($order);
        Http::fake(['sandbox.wompi.co/v1/transactions/*' => Http::response(['data' => array_replace($payment, ['reference' => ['invalid']])])]);
        $this->postJson('/api/v2/wompi/orders/'.$order->id.'/reconcile', ['transaction_id' => $payment['id']])->assertUnprocessable();
        $this->assertSame('PENDING', $order->fresh()->status);
        $this->assertSame('0.00', Wallet::where('user_id', $user->id)->firstOrFail()->balance);
    }

}
