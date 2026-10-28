<?php

namespace App\Modules\Reports\Services;

use App\Models\User;
use App\Modules\Platform\Services\DashboardScope;
use App\Modules\Reports\Models\ReportExport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Throwable;

class ReportExportService
{
    public function __construct(private DashboardScope $scope) {}

    public function authorize(User $user): void
    {
        abort_unless(in_array($user->role, ['SUPERADMIN', 'ADMIN_BARBERIA'], true)
            && $user->hasEffectivePermission('reports.view') && $user->hasEffectivePermission('reports.export'), 403);
    }

    public function create(User $user, array $filters): ReportExport
    {
        $this->authorize($user);
        $businesses = $this->scope->businesses($user);
        if (isset($filters['business_id'])) {
            abort_unless((clone $businesses)->whereKey($filters['business_id'])->exists(), 403);
            $businesses->whereKey($filters['business_id']);
        }
        $businessIds = $businesses->orderBy('id')->pluck('id')->all();
        abort_if($businessIds === [], 422, 'No tienes negocios disponibles para exportar.');
        ksort($filters);
        $fingerprint = hash('sha256', json_encode([$businessIds, $filters], JSON_THROW_ON_ERROR));
        [$export, $created] = DB::transaction(function () use ($user, $filters, $businessIds, $fingerprint) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $active = ReportExport::where('user_id', $user->id)->whereIn('status', ['queued', 'processing'])
                ->where('expires_at', '>', now());
            $existing = (clone $active)->where('fingerprint', $fingerprint)->first();
            if ($existing) {
                return [$existing, false];
            }
            abort_if($active->count() >= config('reports.max_active_per_user'), 429, 'Espera a que termine alguna de tus exportaciones.');
            return [ReportExport::create([
                'id' => (string) Str::uuid(), 'user_id' => $user->id, 'business_ids' => $businessIds,
                'filters' => $filters, 'fingerprint' => $fingerprint, 'status' => 'queued',
                'expires_at' => now()->addHours(config('reports.expires_hours')),
            ]), true];
        });
        if ($created) {
            try {
                // Dedicated unprefixed Redis connection; Go consumes this same stream.
                Redis::connection(config('reports.redis_connection'))->eval(
                    "return redis.call('XADD', KEYS[1], '*', 'report_id', ARGV[1])",
                    1, config('reports.stream'), $export->id
                );
            } catch (Throwable $exception) {
                $export->update(['status' => 'failed', 'error' => 'La cola no está disponible. Intenta nuevamente.']);
                report($exception);
                abort(503, 'La cola de reportes no está disponible. Intenta nuevamente.');
            }
        }
        return $export;
    }

    public function find(User $user, string $id): ReportExport
    {
        $this->authorize($user);
        $export = ReportExport::where('user_id', $user->id)->findOrFail($id);
        $currentIds = $this->scope->businesses($user)->pluck('id')->all();
        abort_if(array_diff($export->business_ids, $currentIds) !== [], 403);
        return $export;
    }
}
