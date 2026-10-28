<?php

namespace Tests\Feature;

use App\Jobs\Booking\SendBookingEmail;
use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Booking\Services\AppointmentNotificationService;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Models\Notification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ProfileIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_is_owned_persists_contact_and_synchronizes_linked_profiles(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $user = User::factory()->create(['role' => 'CLIENTE']);
        $client = Client::factory()->create(['user_id' => $user->id]);
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => Business::factory()->create()->id, 'name' => $user->name, 'email' => $user->email]);
        $other = User::factory()->create(['name' => 'Otra persona']);
        Sanctum::actingAs($user);
        $this->getJson('/api/profile')->assertOk()->assertJsonPath('user.id', $user->id)->assertJsonPath('preferences.theme', 'light')->assertJsonMissingPath('user.password');
        $this->putJson('/api/profile', ['name' => 'Nuevo nombre', 'phone' => '+57 300 111 2222', 'user_id' => $other->id])->assertOk()->assertJsonPath('user.name', 'Nuevo nombre');
        $this->assertSame('Nuevo nombre', $client->fresh()->name);
        $this->assertSame('+57 300 111 2222', $professional->fresh()->phone);
        $this->assertSame('Otra persona', $other->fresh()->name);
        $this->putJson('/api/profile', ['name' => 'Cambio', 'role' => 'SUPERADMIN'])->assertUnprocessable();
        $this->putJson('/api/profile', ['name' => 'Cambio', 'email' => 'bypass@example.test'])->assertUnprocessable();
        $this->assertSame('CLIENTE', $user->fresh()->role);
    }

    public function test_preferences_persist_validate_and_suppress_only_opted_out_deliveries(): void
    {
        config(['booking.email_enabled' => true, 'booking.reminder_minutes' => [60]]);
        $this->travelTo(\Carbon\Carbon::parse('2030-05-01 09:05:00', 'America/Bogota'));
        $user = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($user);
        $preferences = ['language' => 'en', 'theme' => 'dark', 'appointment_reminders' => false, 'email_notifications' => false];
        $this->putJson('/api/profile/preferences', $preferences)->assertOk()->assertJsonPath('preferences', $preferences);
        $this->getJson('/api/profile')->assertOk()->assertJsonPath('preferences.email_notifications', false)->assertJsonPath('preferences.theme', 'dark');
        $this->putJson('/api/profile/preferences', [...$preferences, 'theme' => 'invalid'])->assertUnprocessable();
        $appointment = $this->appointment($user);
        $service = app(AppointmentNotificationService::class);
        $service->sendDueReminders();
        $this->assertSame(0, Notification::where('user_id', $user->id)->count());
        $event = DB::table('booking.appointment_events')->insertGetId(['appointment_id' => $appointment->id, 'type' => 'confirmed', 'created_at' => now()]);
        $service->record($event);
        $this->assertSame(1, Notification::where('user_id', $user->id)->count());
        $delivery = DB::table('booking.notification_deliveries')->where('user_id', $user->id)->first();
        $this->assertSame('DISABLED', $delivery->status);
        DB::table('booking.notification_deliveries')->where('id', $delivery->id)->update(['status' => 'PENDING']);
        Mail::fake();
        (new SendBookingEmail($delivery->id))->handle();
        Mail::assertNothingSent();
        $this->assertSame('USER_PREFERENCE', DB::table('booking.notification_deliveries')->find($delivery->id)->last_error);
    }

    public function test_password_reauthenticates_and_revokes_other_sessions_but_keeps_current_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPassword42!')]);
        $current = $user->createToken('current');
        $other = $user->createToken('other');
        $this->withToken($current->plainTextToken);
        $body = ['current_password' => 'wrong', 'password' => 'NewPassword2026!', 'password_confirmation' => 'NewPassword2026!'];
        $this->putJson('/api/profile/password', $body)->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->putJson('/api/profile/password', [...$body, 'current_password' => 'OriginalPassword42!'])->assertOk();
        $this->assertTrue(Hash::check('NewPassword2026!', $user->fresh()->password));
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
    }

    public function test_email_changes_reauthenticate_enforce_uniqueness_and_preserve_provider_security(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPassword42!')]);
        $client = Client::factory()->create(['user_id' => $user->id]);
        User::factory()->create(['email' => 'taken@example.test']);
        Sanctum::actingAs($user);
        $body = ['email' => 'TAKEN@example.test', 'current_password' => 'OriginalPassword42!'];
        $this->putJson('/api/profile/email', $body)->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->putJson('/api/profile/email', [...$body, 'email' => 'OWN@example.test'])->assertOk()->assertJsonPath('user.email', 'own@example.test');
        $this->assertSame('own@example.test', $client->fresh()->email);
        $user->forceFill(['google_id' => 'test-linked-account'])->save();
        $this->putJson('/api/profile/email', [...$body, 'email' => 'another@example.test'])->assertUnprocessable();
    }

    public function test_enabled_two_factor_cannot_be_bypassed_by_password_only(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalPassword42!')]);
        DB::table('auth.two_factor_auths')->insert(['user_id' => $user->id, 'secret' => 'JBSWY3DPEHPK3PXP', 'enabled' => true, 'recovery_codes' => '[]', 'created_at' => now(), 'updated_at' => now()]);
        Sanctum::actingAs($user);
        $this->putJson('/api/profile/password', ['current_password' => 'OriginalPassword42!', 'password' => 'NewPassword2026!', 'password_confirmation' => 'NewPassword2026!'])->assertUnprocessable()->assertJsonValidationErrors('two_factor_code');
        $this->assertTrue(Hash::check('OriginalPassword42!', $user->fresh()->password));
    }

    public function test_avatar_validates_image_and_removes_only_the_authenticated_accounts_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        Storage::disk('public')->put('avatars/other/keep.png', 'unrelated');
        $this->postJson('/api/profile/avatar', ['avatar' => UploadedFile::fake()->create('unsafe.svg', 1, 'image/svg+xml')])->assertUnprocessable();
        $this->postJson('/api/profile/avatar', ['avatar' => UploadedFile::fake()->image('avatar.png', 64, 64)])->assertOk()->assertJsonStructure(['user' => ['avatar_url']]);
        $path = $user->fresh()->avatar_path;
        $this->assertStringStartsWith('avatars/'.$user->id.'/', $path);
        Storage::disk('public')->assertExists($path);
        $this->deleteJson('/api/profile/avatar')->assertOk()->assertJsonPath('user.avatar_url', null);
        Storage::disk('public')->assertMissing($path);
        Storage::disk('public')->assertExists('avatars/other/keep.png');
    }

    private function appointment(User $user): Appointment
    {
        $business = Business::factory()->create();
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Principal', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id]);
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => $client->id,
            'date' => '2030-05-01', 'start_time' => '10:00:00', 'end_time' => '10:30:00', 'status' => 'CONFIRMED', 'price' => 30000, 'final_price' => 30000, 'currency' => 'COP']);
    }
}
