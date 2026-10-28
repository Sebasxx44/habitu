<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Catalog\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingDistributionTest extends TestCase
{
    use RefreshDatabase;
    private User $owner;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
        config(['app.url' => 'https://api.habitu.test', 'app.frontend_url' => 'https://habitu.test']);
        $this->owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $this->business = Business::factory()->create(['owner_user_id' => $this->owner->id]);
        Sanctum::actingAs($this->owner);
    }

    private function link(array $selection = []): array
    {
        return $this->postJson('/api/v2/distribution/links', $selection + ['business_id' => $this->business->id, 'label' => 'Entrada web'])
            ->assertCreated()->json('data');
    }

    public function test_links_preserve_valid_context_without_open_redirect_and_can_be_revoked(): void
    {
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        $link = $this->link(['service_id' => $service->id]);
        $this->get('/api/v2/distribution/go/'.$link['id'].'?redirect=https://evil.test')
            ->assertRedirect('https://habitu.test/b/'.$this->business->slug.'?service_id='.$service->id.'&book=1');
        $this->assertDatabaseHas('marketing.booking_links', ['id' => $link['id'], 'opens_count' => 1]);
        $this->deleteJson('/api/v2/distribution/links/'.$link['id'])->assertOk();
        $this->get('/api/v2/distribution/go/'.$link['id'])->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_cross_business_selections_and_unowned_settings_are_rejected(): void
    {
        $service = Service::factory()->create();
        $this->postJson('/api/v2/distribution/links', ['business_id' => $this->business->id, 'label' => 'No', 'service_id' => $service->id])->assertUnprocessable();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->getJson('/api/v2/distribution?business_id='.$this->business->id)->assertForbidden();
        $this->putJson('/api/v2/distribution/'.$this->business->id.'/settings', ['enabled' => true, 'theme' => 'light', 'locale' => 'es', 'allowed_origins' => []])->assertForbidden();
    }

    public function test_widget_uses_csp_exact_origins_escaped_content_and_no_scripts_or_cookies(): void
    {
        $this->business->update(['name' => '<script>alert(1)</script>']);
        $link = $this->link();
        $this->get('/api/v2/distribution/widget/'.$link['id'])->assertNotFound();
        $this->putJson('/api/v2/distribution/'.$this->business->id.'/settings', ['enabled' => true, 'theme' => 'dark', 'locale' => 'es', 'allowed_origins' => ['https://EXAMPLE.com/', 'https://example.com']])->assertOk()->assertJsonPath('data.allowed_origins', ['https://example.com']);
        $response = $this->get('/api/v2/distribution/widget/'.$link['id'])->assertOk();
        $response->assertHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self' https://example.com; base-uri 'none'; form-action 'none'")
            ->assertHeader('Referrer-Policy', 'no-referrer')->assertDontSee('<script>', false)->assertSee('&lt;script&gt;', false);
        $this->assertFalse($response->headers->has('Set-Cookie'));
        $this->assertSame(0, DB::table('marketing.booking_links')->where('id', $link['id'])->value('opens_count'));
    }

    public function test_widget_rejects_unsafe_origins_and_disabled_target(): void
    {
        foreach (['https://*.example.com', 'javascript:alert(1)', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com?x=1'] as $origin) {
            $this->putJson('/api/v2/distribution/'.$this->business->id.'/settings', ['enabled' => true, 'theme' => 'light', 'locale' => 'es', 'allowed_origins' => [$origin]])->assertUnprocessable();
        }
        $service = Service::factory()->create(['business_id' => $this->business->id]);
        $link = $this->link(['service_id' => $service->id]);
        $service->update(['is_active' => false]);
        $this->getJson('/api/v2/distribution/go/'.$link['id'])->assertUnprocessable();
        $this->assertSame(0, DB::table('marketing.booking_links')->where('id', $link['id'])->value('opens_count'));
    }
}
