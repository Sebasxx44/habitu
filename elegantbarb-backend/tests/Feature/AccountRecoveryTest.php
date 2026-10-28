<?php

namespace Tests\Feature;

use App\Mail\PasswordRecovery;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AccountRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_recovery_response_does_not_reveal_whether_the_account_exists(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $known = $this->postJson('/api/auth/forgot-password', ['email' => $user->email])->assertOk()->json();
        $missing = $this->postJson('/api/auth/forgot-password', ['email' => 'missing@example.test'])->assertOk()->json();
        $this->assertSame($known, $missing);
        Mail::assertSent(PasswordRecovery::class, 1);
        $record = DB::table('password_reset_tokens')->where('email', $user->email)->first();
        $this->assertNotNull($record);
        $this->assertStringStartsWith('$2y$', $record->token);
    }

    public function test_reset_is_single_use_and_revokes_all_api_sessions(): void
    {
        $user = User::factory()->create();
        $user->createToken('before-reset');
        $token = Password::createToken($user);
        $data = ['email' => $user->email, 'token' => $token, 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'];
        $this->postJson('/api/auth/reset-password', $data)->assertOk();
        $this->assertTrue(Hash::check($data['password'], $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/auth/reset-password', $data)->assertUnprocessable();
    }

    public function test_expired_token_does_not_change_password_or_sessions(): void
    {
        $user = User::factory()->create();
        $user->createToken('active');
        $token = Password::createToken($user);
        DB::table('password_reset_tokens')->where('email', $user->email)->update(['created_at' => now()->subHours(2)]);
        $this->postJson('/api/auth/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'new-password-123', 'password_confirmation' => 'new-password-123'])->assertUnprocessable();
        $this->assertSame(1, $user->tokens()->count());
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
