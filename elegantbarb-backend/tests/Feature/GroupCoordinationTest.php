<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Booking\Models\Appointment;
use App\Modules\Business\Models\Business;
use App\Modules\Business\Models\BusinessBranch;
use App\Modules\Catalog\Models\Service;
use App\Modules\People\Models\Client;
use App\Services\FeatureFlagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class GroupCoordinationTest extends TestCase
{
    use RefreshDatabase;
    private User $organizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(12, 0));
        app(FeatureFlagService::class)->enable('group_coordination');
        $this->organizer = User::factory()->create(['role' => 'CLIENTE', 'email' => 'private-organizer@example.test']);
        Sanctum::actingAs($this->organizer);
    }

    public function test_join_is_idempotent_capacity_is_enforced_and_declining_releases_a_place(): void
    {
        $group = $this->createGroup(2);
        $member = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($member);
        foreach (range(1, 2) as $attempt) $this->postJson('/api/v2/groups/join', ['token' => $group['invite_token']])->assertOk()->assertJsonPath('data.confirmed_count', 2);
        $other = User::factory()->create(['role' => 'CLIENTE']);
        Sanctum::actingAs($other);
        $this->postJson('/api/v2/groups/join', ['token' => $group['invite_token']])->assertStatus(409);
        Sanctum::actingAs($member);
        $this->postJson('/api/v2/groups/'.$group['id'].'/response', ['response' => 'DECLINED'])->assertOk()->assertJsonPath('data.confirmed_count', 1);
        Sanctum::actingAs($other);
        $this->postJson('/api/v2/groups/join', ['token' => $group['invite_token']])->assertOk();
        Sanctum::actingAs($member);
        $this->postJson('/api/v2/groups/'.$group['id'].'/response', ['response' => 'CONFIRMED'])->assertStatus(409);
        $this->assertDatabaseCount('booking.appointments', 0);
        $this->assertDatabaseCount('finance.checkout_orders', 0);
    }

    public function test_invitation_rotation_revokes_old_token_and_expiration_is_enforced_on_server(): void
    {
        $group = $this->createGroup();
        $rotated = $this->postJson('/api/v2/groups/'.$group['id'].'/invitation')->assertOk()->json('data.invite_token');
        $this->assertNotSame($group['invite_token'], $rotated);
        $this->assertSame(hash('sha256', $rotated), DB::table('booking.groups')->where('id', $group['id'])->value('invite_hash'));
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/v2/groups/join', ['token' => $group['invite_token']])->assertNotFound();
        $this->postJson('/api/v2/groups/join', ['token' => $rotated])->assertOk();
        $this->travel(8)->days();
        $this->postJson('/api/v2/groups/join', ['token' => $rotated])->assertStatus(410);
        $this->getJson('/api/v2/groups/'.$group['id'])->assertOk()->assertJsonPath('data.status', 'EXPIRED');
    }

    public function test_members_only_see_minimum_context_and_cannot_manage_or_vote_on_another_group(): void
    {
        $group = $this->createGroup();
        $other = $this->createGroup();
        $member = User::factory()->create(['role' => 'CLIENTE', 'email' => 'private-member@example.test']);
        Sanctum::actingAs($member);
        $this->getJson('/api/v2/groups/'.$group['id'])->assertNotFound();
        $this->postJson('/api/v2/groups/join', ['token' => $group['invite_token']])->assertOk()->assertJsonPath('data.members', [])->assertJsonMissingPath('data.invite_token');
        $this->putJson('/api/v2/groups/'.$group['id'], ['status' => 'CLOSED'])->assertForbidden();
        $this->postJson('/api/v2/groups/'.$group['id'].'/invitation')->assertForbidden();
        $this->postJson('/api/v2/groups/'.$group['id'].'/response', ['response' => 'CONFIRMED', 'option_id' => $other['options'][0]['id']])->assertUnprocessable();
        $this->postJson('/api/v2/groups/'.$group['id'].'/response', ['response' => 'CONFIRMED', 'option_id' => $group['options'][0]['id']])->assertOk()->assertJsonPath('data.options.0.votes', 1);
        $this->postJson('/api/v2/groups/'.$group['id'].'/response', ['response' => 'CONFIRMED', 'option_id' => $group['options'][1]['id']])->assertOk()->assertJsonPath('data.options.0.votes', 0)->assertJsonPath('data.options.1.votes', 1);
        Sanctum::actingAs($this->organizer);
        $response = $this->getJson('/api/v2/groups/'.$group['id'])->assertOk()->assertJsonMissingPath('data.members.0.email')->assertJsonMissingPath('data.members.0.user_id');
        $this->assertStringNotContainsString('private-member@example.test', $response->getContent());
        $this->assertStringNotContainsString('private-organizer@example.test', $response->getContent());
    }

    public function test_linking_requires_owned_compatible_reservation_and_business_feature_scope(): void
    {
        $group = $this->createGroup();
        $business = Business::factory()->create();
        $booking = $this->appointment($business, $this->organizer);
        DB::table('platform.feature_flag_scopes')->insert(['flag' => 'group_coordination', 'scope_type' => 'business', 'scope_id' => $business->id, 'enabled' => false, 'created_at' => now(), 'updated_at' => now()]);
        $this->putJson('/api/v2/groups/'.$group['id'], ['appointment_id' => $booking->id])->assertForbidden();
        DB::table('platform.feature_flag_scopes')->where('scope_id', $business->id)->update(['enabled' => true]);
        $foreign = $this->appointment($business, User::factory()->create(['role' => 'CLIENTE']));
        $this->putJson('/api/v2/groups/'.$group['id'], ['appointment_id' => $foreign->id])->assertForbidden();
        $this->putJson('/api/v2/groups/'.$group['id'], ['appointment_id' => $booking->id])->assertOk()->assertJsonPath('data.payment_mode', 'ORGANIZER_PAYS')->assertJsonPath('data.contributions_enabled', false);
        $second = $this->createGroup();
        $this->putJson('/api/v2/groups/'.$second['id'], ['appointment_id' => $booking->id])->assertStatus(409);
    }

    private function createGroup(int $limit = 5): array
    {
        return $this->postJson('/api/v2/groups', ['title' => 'Plan de cancha', 'member_limit' => $limit, 'expires_at' => now()->addDays(7)->toIso8601String(), 'options' => ['Lunes 10:00', 'Martes 11:00']])->assertCreated()->json('data');
    }

    private function appointment(Business $business, User $user): Appointment
    {
        $branch = BusinessBranch::create(['business_id' => $business->id, 'name' => 'Sede', 'address' => 'Pereira']);
        $service = Service::factory()->create(['business_id' => $business->id]);
        $client = Client::factory()->create(['user_id' => $user->id, 'business_id' => $business->id]);
        return Appointment::create(['business_id' => $business->id, 'branch_id' => $branch->id, 'service_id' => $service->id, 'client_id' => $client->id,
            'date' => '2026-10-07', 'start_time' => '10:00', 'end_time' => '11:00', 'status' => 'CONFIRMED', 'price' => 10000, 'final_price' => 10000, 'currency' => 'COP', 'booking_model' => 'resource']);
    }
}
