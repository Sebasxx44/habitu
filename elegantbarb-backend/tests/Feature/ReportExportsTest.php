<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\Reports\Models\ReportExport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportExportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_requires_role_permission_and_valid_bounded_dates(): void
    {
        $this->postJson('/api/reports/exports', $this->filters())->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'CLIENTE']));
        $this->postJson('/api/reports/exports', $this->filters())->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
        $this->postJson('/api/reports/exports', array_merge($this->filters(), ['end_date' => '2028-10-03']))->assertUnprocessable();
        $this->postJson('/api/reports/exports', array_merge($this->filters(), ['currency' => '../']))->assertUnprocessable();
    }

    public function test_enqueue_is_tenant_scoped_and_duplicate_requests_reuse_active_job(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $foreign = Business::factory()->create();
        Redis::shouldReceive('connection')->once()->with('reports')->andReturnSelf();
        Redis::shouldReceive('eval')->once()->with(\Mockery::type('string'), 1, 'habitu:reports', \Mockery::on(fn ($value) => Str::isUuid($value)))->andReturn('1-0');
        Sanctum::actingAs($owner);
        $this->postJson('/api/reports/exports', array_merge($this->filters(), ['business_id' => $foreign->id]))->assertForbidden();
        $response = $this->postJson('/api/reports/exports', $this->filters())->assertAccepted()->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.rows_processed', 0)->assertJsonPath('data.attempts', 0)->assertJsonPath('data.error', null);
        $id = $response->json('data.id');
        $this->postJson('/api/reports/exports', $this->filters())->assertAccepted()->assertJsonPath('data.id', $id);
        $this->assertSame([$business->id], ReportExport::findOrFail($id)->business_ids);
        $this->assertCount(1, ReportExport::all());
    }

    public function test_download_rechecks_requester_scope_and_signed_link_expires(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        $job = $this->job($owner, $business);
        $directory = sys_get_temp_dir().'/habitu-report-test-'.Str::uuid();
        mkdir($directory, 0700, true);
        config(['reports.directory' => $directory]);
        file_put_contents($directory.'/'.$job->id.'.csv', "Fecha,Cliente\n2026-10-03,María\n");
        try {
            Sanctum::actingAs(User::factory()->create(['role' => 'ADMIN_BARBERIA']));
            $this->getJson('/api/reports/exports/'.$job->id)->assertNotFound();
            $this->getJson('/api/reports/exports/'.$job->id.'/download')->assertNotFound();
            Sanctum::actingAs($owner);
            $this->get('/api/reports/exports/'.$job->id.'/download')->assertDownload();
            $url = $this->postJson('/api/reports/exports/'.$job->id.'/download-link')->assertOk()->json('url');
            $this->get($url)->assertDownload();
            $expired = URL::temporarySignedRoute('report-exports.file', now()->subMinute(), ['id' => $job->id, 'user_id' => $owner->id], false);
            $this->get($expired)->assertForbidden();
            $business->update(['owner_user_id' => User::factory()->create()->id]);
            $this->get($url)->assertForbidden();
        } finally {
            unlink($directory.'/'.$job->id.'.csv');
            rmdir($directory);
        }
    }

    public function test_queue_outage_is_explicit_and_does_not_leave_an_active_job(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        Business::factory()->create(['owner_user_id' => $owner->id]);
        Redis::shouldReceive('connection')->once()->andThrow(new \RuntimeException('Redis offline'));
        Sanctum::actingAs($owner);
        $this->postJson('/api/reports/exports', $this->filters())->assertStatus(503);
        $this->assertSame('failed', ReportExport::firstOrFail()->status);
    }

    public function test_active_exports_are_limited_per_user(): void
    {
        $owner = User::factory()->create(['role' => 'ADMIN_BARBERIA']);
        $business = Business::factory()->create(['owner_user_id' => $owner->id]);
        for ($index = 0; $index < 3; $index++) {
            $this->job($owner, $business)->update(['status' => 'queued']);
        }
        Sanctum::actingAs($owner);
        $this->postJson('/api/reports/exports', $this->filters())->assertStatus(429);
    }

    private function filters(): array
    {
        return ['start_date' => '2026-10-01', 'end_date' => '2026-10-03', 'currency' => 'COP'];
    }

    private function job(User $owner, Business $business): ReportExport
    {
        return ReportExport::create([
            'id' => (string) Str::uuid(), 'user_id' => $owner->id, 'business_ids' => [$business->id],
            'filters' => $this->filters(), 'fingerprint' => Str::random(64), 'status' => 'completed',
            'expires_at' => now()->addDay(),
        ]);
    }
}
