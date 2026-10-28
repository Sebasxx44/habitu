<?php

namespace Tests\Unit\Modules\Finance;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Finance\Models\Wallet;
use App\Modules\Finance\Repositories\WalletRepository;
use App\Modules\Finance\Services\WalletService;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WalletServiceTest extends TestCase
{
    use RefreshDatabase;

    protected WalletService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WalletService(new WalletRepository(new Wallet()));
    }

    public function test_get_or_create_wallet(): void
    {
        $user = \App\Models\User::factory()->create();

        $response = $this->service->getWallet($user->id);

        $this->assertTrue($response->success);
        $this->assertDatabaseHas('finance.wallets', ['user_id' => $user->id]);
    }

    public function test_top_up_increases_balance(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->service->getWallet($user->id);

        $response = $this->service->topUp($user->id, 50000, ['description' => 'Recarga test']);

        $this->assertTrue($response->success);
        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertEquals(50000, (float) $wallet->balance);
    }

    public function test_pay_decreases_balance(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->service->getWallet($user->id);
        $this->service->topUp($user->id, 100000);

        $response = $this->service->pay($user->id, 30000, ['description' => 'Pago test']);

        $this->assertTrue($response->success);
        $wallet = Wallet::where('user_id', $user->id)->first();
        $this->assertEquals(70000, (float) $wallet->balance);
    }

    public function test_pay_fails_with_insufficient_balance(): void
    {
        $user = \App\Models\User::factory()->create();
        $this->service->getWallet($user->id);

        $response = $this->service->pay($user->id, 100000);

        $this->assertFalse($response->success);
    }
}
