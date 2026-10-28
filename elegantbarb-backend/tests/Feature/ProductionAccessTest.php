<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\SuperAdminUserSeeder;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ProductionAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'production-test.apps.googleusercontent.com']);
        Cache::forget('google.identity.certificates');
        Http::preventStrayRequests();
    }

    public function test_public_configuration_exposes_only_the_google_client_identifier(): void
    {
        config(['services.google.client_secret' => 'never-public', 'services.wompi.private_key' => 'never-public']);
        $this->getJson('/api/auth/config')->assertOk()
            ->assertExactJson(['google_client_id' => 'production-test.apps.googleusercontent.com'])
            ->assertHeader('Cache-Control', 'no-store, private');
        config(['services.google.client_id' => null]);
        $this->getJson('/api/auth/config')->assertOk()->assertExactJson(['google_client_id' => null]);
    }

    public function test_registration_normalizes_email_and_rejects_case_variants_of_existing_accounts(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Nueva cuenta', 'email' => 'New@Example.test', 'password' => 'secure-password',
            'password_confirmation' => 'secure-password',
        ])->assertCreated()->assertJsonPath('user.email', 'new@example.test')->assertJsonPath('user.role', 'CLIENTE');
        $this->postJson('/api/auth/register', [
            'name' => 'Otra cuenta', 'email' => 'NEW@EXAMPLE.TEST', 'password' => 'secure-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertSame(1, User::count());
    }

    public function test_registration_rejects_legacy_mixed_case_duplicates_and_weak_passwords(): void
    {
        User::factory()->create(['email' => 'Existing@Example.test']);
        $this->postJson('/api/auth/register', [
            'name' => 'Duplicada', 'email' => 'existing@example.test', 'password' => 'secure-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/auth/register', [
            'name' => 'Débil', 'email' => 'weak@example.test', 'password' => '123456',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertSame(1, User::count());
    }

    public function test_registration_checks_confirmation_when_it_is_submitted(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Nueva', 'email' => 'new@example.test', 'password' => 'secure-password',
            'password_confirmation' => 'different-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('password_confirmation');
        $this->assertSame(0, User::count());
    }

    public function test_login_accepts_email_case_variants_for_existing_accounts(): void
    {
        $user = User::factory()->create(['email' => 'Legacy@Example.test']);
        $this->postJson('/api/auth/login', ['email' => 'LEGACY@EXAMPLE.TEST', 'password' => 'password'])
            ->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_google_uses_the_stable_subject_when_the_google_email_changes(): void
    {
        $user = User::factory()->create(['email' => 'original@example.test', 'google_id' => 'stable-google-subject']);
        $token = $this->googleToken(['email' => 'renamed@example.test', 'hd' => 'example.test']);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertOk()
            ->assertJsonPath('user.id', $user->id)->assertJsonPath('is_new_user', false);
        $this->assertSame(1, User::count());
        $this->assertSame('original@example.test', $user->fresh()->email);
    }

    public function test_google_refuses_to_link_a_different_subject_to_an_existing_account(): void
    {
        $user = User::factory()->create(['email' => 'existing@gmail.com', 'google_id' => 'original-subject']);
        $token = $this->googleToken(['email' => $user->email]);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertUnprocessable()
            ->assertJsonValidationErrors('id_token');
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_google_requires_local_password_to_link_a_non_authoritative_email(): void
    {
        $user = User::factory()->create(['email' => 'existing@example.test']);
        $token = $this->googleToken(['email' => $user->email]);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertUnprocessable()
            ->assertJsonValidationErrors('password');
        $this->assertNull($user->fresh()->google_id);
        $this->postJson('/api/auth/login-google', ['id_token' => $token, 'password' => 'password'])
            ->assertOk()->assertJsonPath('user.id', $user->id);
    }

    public function test_google_rejects_unverified_and_expired_tokens(): void
    {
        $this->postJson('/api/auth/login-google', ['id_token' => $this->googleToken(['email_verified' => false])])
            ->assertUnprocessable()->assertJsonValidationErrors('id_token');
        Cache::forget('google.identity.certificates');
        $this->postJson('/api/auth/login-google', ['id_token' => $this->googleToken(['exp' => time() - 60])])
            ->assertUnprocessable()->assertJsonValidationErrors('id_token');
        $this->assertSame(0, User::count());
    }

    public function test_google_refreshes_cached_certificates_after_signing_key_rotation(): void
    {
        $token = $this->googleToken();
        Cache::put('google.identity.certificates', ['old-key' => 'old-certificate'], 3600);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertOk();
        Http::assertSentCount(1);
    }

    public function test_superadmin_bootstrap_creates_a_production_account_and_permission_foundations(): void
    {
        $this->configureSuperadmin();
        $this->artisan('app:bootstrap-superadmin')->assertSuccessful();
        $user = User::where('email', 'owner@example.test')->firstOrFail();
        $this->assertSame(User::ROLE_SUPERADMIN, $user->role);
        $this->assertTrue(Hash::check('Strong-production-123!', $user->password));
        $this->assertSame(4, Role::count());
        $this->assertGreaterThan(0, Permission::count());
        $this->assertSame(1, User::count());
    }

    public function test_superadmin_bootstrap_preserves_existing_credentials_sessions_and_permissions(): void
    {
        $this->configureSuperadmin();
        $this->artisan('app:bootstrap-superadmin')->assertSuccessful();
        $user = User::where('email', 'owner@example.test')->firstOrFail();
        $user->createToken('existing-session');
        $role = Role::where('slug', 'client')->firstOrFail();
        $role->permissions()->detach();
        config(['auth.bootstrap_superadmin.password' => 'A-different-password-456!']);
        $this->artisan('app:bootstrap-superadmin')->assertSuccessful();
        $this->assertTrue(Hash::check('Strong-production-123!', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame(0, $role->permissions()->count());
        $this->assertSame(1, User::count());
    }

    public function test_superadmin_bootstrap_rejects_weak_secrets_and_does_not_promote_existing_clients(): void
    {
        $this->configureSuperadmin();
        config(['auth.bootstrap_superadmin.password' => 'password']);
        $this->artisan('app:bootstrap-superadmin')->assertFailed();
        $this->assertSame(0, User::count());
        $user = User::factory()->create(['email' => 'owner@example.test', 'role' => User::ROLE_CLIENT]);
        config(['auth.bootstrap_superadmin.password' => 'Strong-production-123!']);
        $this->artisan('app:bootstrap-superadmin')->assertFailed();
        $this->assertSame(User::ROLE_CLIENT, $user->fresh()->role);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_superadmin_bootstrap_has_no_default_credentials_and_can_skip_when_not_configured(): void
    {
        config(['auth.bootstrap_superadmin.email' => null, 'auth.bootstrap_superadmin.password' => null]);
        $this->artisan('app:bootstrap-superadmin')->assertFailed();
        $this->artisan('app:bootstrap-superadmin', ['--if-configured' => true])->assertSuccessful();
        $this->assertSame(0, User::count());
        $this->expectException(\RuntimeException::class);
        $this->seed(SuperAdminUserSeeder::class);
    }

    private function configureSuperadmin(): void
    {
        config(['auth.bootstrap_superadmin.email' => 'Owner@Example.test',
            'auth.bootstrap_superadmin.name' => 'Propietario',
            'auth.bootstrap_superadmin.password' => 'Strong-production-123!']);
    }

    private function googleToken(array $overrides = []): string
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $privateKey);
        $publicKey = openssl_pkey_get_details($key)['key'];
        Http::fake(['https://www.googleapis.com/oauth2/v1/certs' => Http::response(['current-key' => $publicKey], 200, ['Cache-Control' => 'public, max-age=7200'])]);
        return JWT::encode(array_replace([
            'sub' => 'stable-google-subject', 'aud' => 'production-test.apps.googleusercontent.com',
            'iss' => 'https://accounts.google.com', 'exp' => time() + 3600,
            'iat' => time(), 'email' => 'new@gmail.com', 'email_verified' => true, 'name' => 'Google User',
        ], $overrides), $privateKey, 'RS256', 'current-key');
    }
}
