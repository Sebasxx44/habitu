<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use App\Modules\Platform\Services\ProviderReviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class ProviderReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_evidence_is_private_and_tenant_scoped_and_legacy_flag_has_no_public_check(): void
    {
        Storage::fake('local');
        [$owner, $business] = $this->fixture();
        $business->update(['verified' => true]);
        $this->getJson('/api/v2/public/provider-reviews/business/'.$business->id)->assertOk()->assertJsonCount(0, 'data.checks');
        Sanctum::actingAs($owner);
        $base = '/api/v2/provider-reviews/business/'.$business->id;
        $id = $this->postJson($base, ['code' => 'business_registration'])->assertCreated()->json('data.id');
        $this->postJson($base.'/'.$id.'/documents', ['file' => UploadedFile::fake()->createWithContent('registro.pdf', "%PDF-1.4\nprivate-document")])->assertCreated();
        $document = DB::table('platform.provider_documents')->first();
        $this->getJson($base)->assertOk()->assertJsonMissingPath('data.checks.0.documents.0.path')->assertJsonMissingPath('data.checks.0.documents.0.sha256');
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_ADMIN]));
        $this->getJson($base)->assertNotFound();
        $this->getJson($base.'/'.$id.'/documents/'.$document->id)->assertNotFound();
        $this->postJson($base, ['code' => 'business_address'])->assertNotFound();
        Sanctum::actingAs($owner);
        $this->get($base.'/'.$id.'/documents/'.$document->id)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_only_superadmin_can_approve_concrete_evidence_and_public_summary_expires_or_revokes(): void
    {
        Storage::fake('local');
        [$owner, $business] = $this->fixture();
        Sanctum::actingAs($owner);
        $base = '/api/v2/provider-reviews/business/'.$business->id;
        $id = $this->postJson($base, ['code' => 'business_address'])->json('data.id');
        $decision = ['state' => 'APPROVED', 'reason' => 'Soporte de dirección revisado.', 'expires_at' => now()->addDays(30)->toIso8601String(), 'evidence_reviewed' => true];
        $this->putJson($base.'/'.$id.'/decision', $decision)->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_SUPERADMIN]));
        $this->putJson($base.'/'.$id.'/decision', $decision)->assertUnprocessable();
        $this->postJson($base.'/'.$id.'/documents', ['file' => UploadedFile::fake()->createWithContent('direccion.pdf', "%PDF-1.4\naddress-evidence")])->assertCreated();
        $this->putJson($base.'/'.$id.'/decision', $decision)->assertOk();
        $public = '/api/v2/public/provider-reviews/business/'.$business->id;
        $this->getJson($public)->assertOk()->assertJsonPath('data.checks.0.code', 'business_address')
            ->assertJsonPath('data.quality_or_safety_guarantee', false)->assertJsonMissingPath('data.checks.0.documents')->assertJsonMissingPath('data.checks.0.review_note');
        $this->assertFalse($business->fresh()->verified);
        $this->putJson($base.'/'.$id.'/decision', ['state' => 'REVOKED', 'reason' => 'El soporte perdió su vigencia.'])->assertOk();
        $this->getJson($public)->assertJsonCount(0, 'data.checks');
        $this->assertSame(2, DB::table('platform.provider_review_events')->where('action', 'DECIDED')->count());
        $this->postJson($base, ['code' => 'business_address'])->assertCreated();
        $this->assertDatabaseHas('platform.provider_checks', ['id' => $id, 'revision' => 2, 'state' => 'PENDING']);
        $this->getJson($base)->assertJsonCount(0, 'data.checks.0.documents');
        $this->postJson($base.'/'.$id.'/documents', ['file' => UploadedFile::fake()->createWithContent('nueva.pdf', "%PDF-1.4\nnew-evidence")])->assertCreated();
        $this->putJson($base.'/'.$id.'/decision', $decision)->assertOk();
        $this->travel(31)->days();
        $this->getJson($public)->assertJsonCount(0, 'data.checks');
        $this->getJson($base)->assertJsonPath('data.checks.0.state', 'EXPIRED');
    }

    public function test_professional_can_submit_only_own_profile_and_allowed_category_checks(): void
    {
        [$owner, $business] = $this->fixture();
        $user = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $otherUser = User::factory()->create(['role' => User::ROLE_PROFESSIONAL]);
        $professional = Professional::create(['user_id' => $user->id, 'business_id' => $business->id, 'name' => 'Titular', 'is_active' => true]);
        $other = Professional::create(['user_id' => $otherUser->id, 'business_id' => $business->id, 'name' => 'Colega', 'is_active' => true]);
        Sanctum::actingAs($user);
        $this->getJson('/api/v2/provider-reviews')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $professional->id);
        $this->postJson('/api/v2/provider-reviews/professional/'.$professional->id, ['code' => 'professional_identity'])->assertCreated();
        $this->postJson('/api/v2/provider-reviews/professional/'.$professional->id, ['code' => 'category_authorization'])->assertUnprocessable();
        $this->getJson('/api/v2/provider-reviews/professional/'.$other->id)->assertNotFound();
        $this->getJson('/api/v2/provider-reviews/business/'.$business->id)->assertNotFound();
        Sanctum::actingAs($owner);
        $this->getJson('/api/v2/provider-reviews/professional/'.$professional->id)->assertOk();
    }

    public function test_document_limits_and_retention_preserve_minimal_audit(): void
    {
        Storage::fake('local');
        [$owner, $business] = $this->fixture();
        Sanctum::actingAs($owner);
        $base = '/api/v2/provider-reviews/business/'.$business->id;
        $id = $this->postJson($base, ['code' => 'business_registration'])->json('data.id');
        $url = $base.'/'.$id.'/documents';
        $this->postJson($url, ['file' => UploadedFile::fake()->createWithContent('exploit.html', '<script>alert(1)</script>')])->assertUnprocessable();
        $this->postJson($url, ['file' => UploadedFile::fake()->create('large.pdf', 5121, 'application/pdf')])->assertUnprocessable();
        for ($index = 0; $index < 3; $index++) $this->postJson($url, ['file' => UploadedFile::fake()->createWithContent('evidence.pdf', "%PDF-1.4\ntest")])->assertCreated();
        $this->postJson($url, ['file' => UploadedFile::fake()->createWithContent('extra.pdf', "%PDF-1.4\nextra")])->assertUnprocessable();
        $document = DB::table('platform.provider_documents')->first();
        $this->travel(91)->days();
        $this->getJson($url.'/'.$document->id)->assertNotFound();
        $this->assertSame(3, app(ProviderReviewService::class)->prune());
        Storage::disk('local')->assertMissing($document->path);
        $this->assertDatabaseHas('platform.provider_documents', ['id' => $document->id, 'path' => '', 'name' => 'Documento eliminado']);
        $this->assertSame(4, DB::table('platform.provider_review_events')->count());
    }

    private function fixture(): array
    {
        $owner = User::factory()->create(['role' => User::ROLE_ADMIN]);
        return [$owner, Business::factory()->create(['owner_user_id' => $owner->id, 'verified' => false])];
    }

    public function test_failed_file_deletion_keeps_document_path_for_retry(): void
    {
        [$owner, $business] = $this->fixture();
        $service = app(ProviderReviewService::class);
        $check = $service->submit($service->subject('business', $business->id, $owner), $owner, 'business_registration');
        $document = DB::table('platform.provider_documents')->insertGetId(['check_id' => $check, 'revision' => 1, 'uploaded_by' => $owner->id,
            'path' => 'provider-evidence/retry.pdf', 'name' => 'retry.pdf', 'mime_type' => 'application/pdf', 'size' => 100, 'sha256' => str_repeat('0', 64), 'created_at' => now()->subDays(91)]);
        $disk = Mockery::mock(\Illuminate\Contracts\Filesystem\Filesystem::class);
        $disk->shouldReceive('delete')->once()->with('provider-evidence/retry.pdf')->andReturn(false);
        $disk->shouldReceive('exists')->once()->with('provider-evidence/retry.pdf')->andReturn(true);
        Storage::shouldReceive('disk')->twice()->with('local')->andReturn($disk);
        $this->assertSame(0, $service->prune());
        $this->assertDatabaseHas('platform.provider_documents', ['id' => $document, 'path' => 'provider-evidence/retry.pdf', 'purged_at' => null]);
    }
}
