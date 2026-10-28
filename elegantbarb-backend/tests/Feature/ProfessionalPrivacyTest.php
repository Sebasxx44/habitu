<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfessionalPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_business_profile_never_embeds_professional_private_fields(): void
    {
        $business = Business::factory()->create();
        $professional = $this->professional($business);
        $this->getJson('/api/v2/businesses/'.$business->id)->assertOk()
            ->assertJsonPath('data.professionals.0.name', $professional->name)
            ->assertJsonMissingPath('data.professionals.0.email')
            ->assertJsonMissingPath('data.professionals.0.identification_number')
            ->assertJsonMissingPath('data.professionals.0.commission_percentage');
    }

    public function test_customer_catalog_is_public_projection_and_hides_inactive_profiles(): void
    {
        $professional = $this->professional(Business::factory()->create());
        $inactive = $this->professional(Business::factory()->create(), false);
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->getJson('/api/v2/professionals')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonMissingPath('data.0.email')->assertJsonMissingPath('data.0.phone');
        $this->getJson('/api/v2/professionals/'.$professional->id)->assertOk()
            ->assertJsonMissingPath('data.address')->assertJsonMissingPath('data.birthday')
            ->assertJsonMissingPath('data.commission_percentage')->assertJsonMissingPath('data.business.tax_id');
        $this->getJson('/api/v2/professionals/'.$inactive->id)->assertNotFound();
        $this->getJson('/api/v2/professionals/'.$inactive->id.'/availability')->assertNotFound();
        $this->getJson('/api/v2/professionals/stats')->assertForbidden();
    }

    public function test_administrator_can_edit_own_private_profile_but_only_read_foreign_public_profile(): void
    {
        $admin = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $admin->id]);
        $own = $this->professional($business, false);
        $foreign = $this->professional(Business::factory()->create());
        Sanctum::actingAs($admin);
        $this->getJson('/api/v2/professionals/'.$own->id)->assertOk()
            ->assertJsonPath('data.email', $own->email)->assertJsonPath('data.identification_number', 'private-id');
        $this->getJson('/api/v2/professionals/'.$foreign->id)->assertOk()->assertJsonMissingPath('data.email');
        $this->getJson('/api/v2/professionals/stats')->assertOk()->assertJsonPath('data.total', 1);
        $this->getJson('/api/v2/professionals/stats?business_id='.$foreign->business_id)->assertForbidden();
    }

    private function professional(Business $business, bool $active = true): Professional
    {
        return Professional::create(['business_id' => $business->id, 'name' => 'Perfil público',
            'email' => 'private@example.test', 'phone' => 'private-phone', 'identification_number' => 'private-id',
            'address' => 'Domicilio privado', 'birthday' => '1990-01-01', 'commission_percentage' => 35, 'is_active' => $active]);
    }
}
