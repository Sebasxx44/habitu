<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Services\TwoFactorAuthService;
use Database\Seeders\RolesPermissionsSeeder;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesPermissionsSeeder::class);
        config(['services.google.client_id' => 'test-client.apps.googleusercontent.com']);
        Http::preventStrayRequests();
    }

    public function test_google_rejects_email_only_impersonation(): void
    {
        $user = User::factory()->create(['role' => 'SUPERADMIN']);
        $this->postJson('/api/auth/login-google', ['email' => $user->email, 'name' => $user->name, 'google_id' => 'attacker'])
            ->assertUnprocessable()->assertJsonValidationErrors('id_token');
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_google_verifies_signature_audience_and_verified_email(): void
    {
        $token = $this->googleToken(['email' => 'verified@gmail.com']);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertOk()->assertJsonStructure(['token', 'user'])->assertJsonPath('user.email', 'verified@gmail.com');
    }

    public function test_google_rejects_wrong_audience(): void
    {
        $token = $this->googleToken(['aud' => 'another-client']);
        $this->postJson('/api/auth/login-google', ['id_token' => $token])->assertUnprocessable();
        $this->assertSame(0, User::count());
    }

    public function test_google_fails_closed_without_configuration(): void
    {
        config(['services.google.client_id' => null]);
        $this->postJson('/api/auth/login-google', ['id_token' => 'invalid'])->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_two_factor_is_required_before_token_issuance_and_recovery_is_single_use(): void
    {
        $user = User::factory()->create();
        $service = app(TwoFactorAuthService::class);
        $setup = $service->generateSecret($user);
        $code = (new Google2FA())->getCurrentOtp($setup['secret']);
        $this->assertTrue($service->enable($user, $code));
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('two_factor_code');
        $this->assertSame(0, $user->tokens()->count());
        $credentials = ['email' => $user->email, 'password' => 'password', 'two_factor_code' => $setup['recovery_codes'][0]];
        $this->postJson('/api/auth/login', $credentials)->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/auth/login', $credentials)->assertUnprocessable();
        $record = DB::table('auth.two_factor_auths')->where('user_id', $user->id)->first();
        $this->assertNotSame($setup['secret'], $record->secret);
        $this->assertStringNotContainsString($setup['recovery_codes'][1], $record->recovery_codes);
    }

    public function test_enabled_two_factor_cannot_be_reset_without_verification(): void
    {
        $user = User::factory()->create();
        $service = app(TwoFactorAuthService::class);
        $setup = $service->generateSecret($user);
        $service->enable($user, (new Google2FA())->getCurrentOtp($setup['secret']));
        Sanctum::actingAs($user);
        $this->getJson('/api/auth/2fa/setup')->assertUnprocessable();
        $this->assertTrue($service->isEnabled($user));
    }

    public function test_registration_does_not_accept_foreign_profiles(): void
    {
        $foreignClient = Client::factory()->create();
        $this->postJson('/api/auth/register', ['name' => 'Nuevo', 'email' => 'new@example.test', 'password' => 'test-password',
            'cliente_id' => $foreignClient->id, 'barber_id' => 45, 'barber_shop_id' => 22])->assertCreated();
        $user = User::where('email', 'new@example.test')->firstOrFail();
        $this->assertNotSame($foreignClient->id, $user->cliente_id);
        $this->assertSame($user->id, $user->cliente->user_id);
        $this->assertNull($user->barber_shop_id);
    }

    public function test_client_cannot_access_admin_dashboards_or_mutate_catalog(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/dashboard/superadmin')->assertForbidden();
        $this->getJson('/api/v2/dashboard/superadmin')->assertForbidden();
        $this->getJson('/api/dashboard/income-chart')->assertForbidden();
        $this->postJson('/api/v2/services', [])->assertForbidden();
        $this->getJson('/api/auth/users')->assertForbidden();
    }

    public function test_admin_cannot_modify_another_tenant_by_omitting_business_filter(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $own = Business::factory()->create(['owner_user_id' => $admin->id]);
        $foreign = Service::factory()->create();
        Sanctum::actingAs($admin);
        $this->putJson('/api/v2/services/'.$foreign->id, ['name' => 'Changed'])->assertForbidden();
        $this->putJson('/api/v2/services/'.$foreign->id, ['name' => 'Changed', 'business_id' => $own->id])->assertForbidden();
        $this->deleteJson('/api/v2/services/'.$foreign->id)->assertForbidden();
        $this->assertNotSame('Changed', $foreign->fresh()->name);
    }

    public function test_customer_list_is_scoped_and_points_cannot_be_changed_by_client(): void
    {
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $own = Client::factory()->create(['user_id' => $user->id]);
        Client::factory()->create();
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/clients')->assertOk()->assertJsonCount(1, 'data.data')->assertJsonPath('data.data.0.id', $own->id);
        $this->putJson('/api/v2/clients/'.$own->id, ['loyalty_points' => 999999])->assertForbidden();
    }

    public function test_explicit_role_permissions_are_enforced_on_server(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $admin->id]);
        $service = Service::factory()->create(['business_id' => $business->id]);
        $limited = Role::create(['name' => 'Consulta', 'slug' => 'read-only', 'type' => 'custom']);
        $admin->roles()->attach($limited);
        Sanctum::actingAs($admin);
        $this->putJson('/api/v2/services/'.$service->id, ['name' => 'Changed'])->assertForbidden();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('permissions', []);
    }

    public function test_calendar_callback_rejects_forged_state_and_consumes_nonce_once(): void
    {
        config(['services.google_calendar.client_id' => 'configured', 'services.google_calendar.client_secret' => 'configured']);
        $calendar = app(\App\Modules\Platform\Services\GoogleCalendarService::class);
        $url = $calendar->getAuthorizationUrl(99);
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame(99, $calendar->consumeState($query['state']));
        $this->assertNull($calendar->consumeState($query['state']));
        $forged = base64_encode(json_encode(['professional_id' => 99]));
        $this->getJson('/api/v2/google-calendar/callback?code=forged&state='.urlencode($forged))->assertStatus(400);
        Http::assertNothingSent();
    }

    public function test_google_calendar_professional_cannot_disconnect_another_professional(): void
    {
        $user = User::factory()->create(['role' => 'PROFESSIONAL']);
        $business = Business::factory()->create();
        \App\Modules\People\Models\Professional::create(['user_id' => $user->id, 'business_id' => $business->id, 'name' => 'Propio']);
        $other = \App\Modules\People\Models\Professional::create(['business_id' => $business->id, 'name' => 'Ajeno']);
        Sanctum::actingAs($user);
        $this->postJson('/api/v2/google-calendar/disconnect', ['professional_id' => $other->id])->assertForbidden();
    }

    private function googleToken(array $overrides = []): string
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $privateKey);
        $publicKey = openssl_pkey_get_details($key)['key'];
        Http::fake(['https://www.googleapis.com/oauth2/v1/certs' => Http::response(['test-key' => $publicKey])]);
        return JWT::encode(array_replace([
            'sub' => 'verified-subject', 'aud' => 'test-client.apps.googleusercontent.com',
            'iss' => 'https://accounts.google.com', 'exp' => time() + 3600,
            'iat' => time(), 'email' => 'user@gmail.com', 'email_verified' => true, 'name' => 'Google User',
        ], $overrides), $privateKey, 'RS256', 'test-key');
    }
}
