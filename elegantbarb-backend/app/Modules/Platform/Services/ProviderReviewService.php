<?php

namespace App\Modules\Platform\Services;

use App\Models\User;
use App\Modules\Business\Models\Business;
use App\Modules\People\Models\Professional;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class ProviderReviewService
{
    public function subject(string $kind, int $id, ?User $actor = null): array
    {
        abort_unless(in_array($kind, ['business', 'professional'], true), 404);
        $professional = $kind === 'professional' ? Professional::findOrFail($id) : null;
        $business = Business::with('category')->findOrFail($professional?->business_id ?? $id);
        if ($actor) {
            $ownsBusiness = $actor->role === User::ROLE_ADMIN && (int) $business->owner_user_id === $actor->id;
            $ownsProfile = $professional && $actor->role === User::ROLE_PROFESSIONAL && (int) $professional->user_id === $actor->id;
            abort_unless($actor->role === User::ROLE_SUPERADMIN || $ownsBusiness || $ownsProfile, 404);
        } else abort_unless($business->is_active && (! $professional || $professional->is_active), 404);
        return ['key' => $kind.':'.$id, 'kind' => $kind, 'id' => $id, 'name' => $professional?->name ?? $business->name, 'business' => $business, 'professional' => $professional];
    }

    public function subjects(User $actor, string $search = ''): array
    {
        $businesses = Business::query()->when($actor->role !== User::ROLE_SUPERADMIN, fn ($q) => $q->where('owner_user_id', $actor->id)->whereRaw('? = ?', [$actor->role, User::ROLE_ADMIN]))
            ->when($search !== '', fn ($q) => $q->where('name', 'ilike', '%'.$search.'%'))->limit(100)->get(['id', 'name']);
        $professionals = Professional::query()->when($actor->role !== User::ROLE_SUPERADMIN, function ($q) use ($actor) {
            if ($actor->role === User::ROLE_ADMIN) $q->whereIn('business_id', Business::where('owner_user_id', $actor->id)->select('id'));
            else $q->where('user_id', $actor->id)->whereRaw('? = ?', [$actor->role, User::ROLE_PROFESSIONAL]);
        })->when($search !== '', fn ($q) => $q->where('name', 'ilike', '%'.$search.'%'))->limit(100)->get(['id', 'name']);
        return $businesses->map(fn ($row) => ['kind' => 'business', 'id' => $row->id, 'name' => $row->name])->concat(
            $professionals->map(fn ($row) => ['kind' => 'professional', 'id' => $row->id, 'name' => $row->name]))->values()->all();
    }

    public function definitions(array $subject): array
    {
        $definitions = $subject['kind'] === 'business'
            ? [['code' => 'business_registration', 'label' => 'Registro del negocio revisado', 'label_en' => 'Business registration reviewed'],
                ['code' => 'business_address', 'label' => 'Soporte de dirección revisado', 'label_en' => 'Address evidence reviewed']]
            : [['code' => 'professional_identity', 'label' => 'Documento de identidad revisado', 'label_en' => 'Identity document reviewed'],
                ['code' => 'professional_training', 'label' => 'Soporte de formación revisado', 'label_en' => 'Training evidence reviewed']];
        $category = Str::ascii(($subject['business']->category?->slug ?? '').' '.($subject['business']->category?->name ?? ''));
        if (preg_match('/health|salud|dental|clini|medic|odont|psico|terapia/i', $category)) $definitions[] = ['code' => 'category_authorization', 'label' => 'Autorización aportada para la categoría revisada', 'label_en' => 'Submitted category authorization reviewed'];
        if ($subject['kind'] === 'business' && preg_match('/cancha|sport|deport|space|espacio/i', $category)) $definitions[] = ['code' => 'venue_operation', 'label' => 'Soporte de operación del espacio revisado', 'label_en' => 'Venue operation evidence reviewed'];
        return $definitions;
    }

    public function inspect(array $subject): array
    {
        $checks = DB::table('platform.provider_checks')->where('subject_key', $subject['key'])->orderBy('id')->get();
        return ['subject' => ['kind' => $subject['kind'], 'id' => $subject['id'], 'name' => $subject['name']], 'definitions' => $this->definitions($subject),
            'document_retention_days' => 90, 'checks' => $checks->map(function ($check) {
                $check->state = $check->state === 'APPROVED' && CarbonImmutable::parse($check->expires_at)->isPast() ? 'EXPIRED' : $check->state;
                $check->documents = DB::table('platform.provider_documents')->where('check_id', $check->id)->where('revision', $check->revision)
                    ->whereNull('purged_at')->where('created_at', '>', now()->subDays(90))->get(['id', 'name', 'mime_type', 'size', 'created_at']);
                $check->audit = DB::table('platform.provider_review_events')->where('check_id', $check->id)->orderByDesc('id')->limit(30)->get(['action', 'from_state', 'to_state', 'reason', 'actor_id', 'created_at']);
                return $check;
            })->all()];
    }

    public function publicSummary(string $kind, int $id): array
    {
        $subject = $this->subject($kind, $id);
        $definitions = collect($this->definitions($subject))->keyBy('code');
        return DB::table('platform.provider_checks')->where('subject_key', $subject['key'])->where('state', 'APPROVED')
            ->where('expires_at', '>', now())->whereIn('code', $definitions->keys())->orderBy('code')->get(['code', 'reviewed_at', 'expires_at'])
            ->map(fn ($check) => ['code' => $check->code, 'label' => $definitions[$check->code]['label'], 'label_en' => $definitions[$check->code]['label_en'],
                'reviewed_at' => $check->reviewed_at, 'expires_at' => $check->expires_at])->all();
    }

    public function submit(array $subject, User $actor, string $code): int
    {
        abort_unless(in_array($code, array_column($this->definitions($subject), 'code'), true), 422, 'Comprobación no aplicable a esta categoría.');
        return DB::transaction(function () use ($subject, $actor, $code) {
            Business::whereKey($subject['business']->id)->lockForUpdate()->firstOrFail();
            $check = DB::table('platform.provider_checks')->where('subject_key', $subject['key'])->where('code', $code)->lockForUpdate()->first();
            if ($check?->state === 'PENDING') return $check->id;
            $data = ['state' => 'PENDING', 'revision' => ($check?->revision ?? 0) + 1, 'submitted_by' => $actor->id,
                'reviewed_by' => null, 'review_note' => null, 'reviewed_at' => null, 'expires_at' => null, 'updated_at' => now()];
            if ($check) { DB::table('platform.provider_checks')->where('id', $check->id)->update($data); $id = $check->id; }
            else $id = DB::table('platform.provider_checks')->insertGetId($data + ['subject_key' => $subject['key'], 'business_id' => $subject['business']->id,
                'professional_id' => $subject['professional']?->id, 'code' => $code, 'created_at' => now()]);
            $this->audit($id, $data['revision'], $actor->id, 'SUBMITTED', $check?->state, 'PENDING');
            return $id;
        });
    }

    public function upload(array $subject, User $actor, int $checkId, UploadedFile $file): void
    {
        $path = null;
        try {
            DB::transaction(function () use ($subject, $actor, $checkId, $file, &$path) {
                $check = $this->check($subject, $checkId, true);
                abort_unless($check->state === 'PENDING', 409, 'Inicia una nueva revisión antes de añadir evidencia.');
                abort_if(DB::table('platform.provider_documents')->where('check_id', $checkId)->where('revision', $check->revision)->count() >= 3, 422, 'Máximo tres documentos por revisión.');
                $path = $file->store('provider-evidence', 'local');
                DB::table('platform.provider_documents')->insert(['check_id' => $checkId, 'revision' => $check->revision, 'uploaded_by' => $actor->id,
                    'path' => $path, 'name' => Str::limit(basename($file->getClientOriginalName()), 180, ''), 'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(), 'sha256' => hash_file('sha256', $file->getRealPath()), 'created_at' => now()]);
                $this->audit($checkId, $check->revision, $actor->id, 'DOCUMENT_ADDED', $check->state, $check->state);
            });
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }
    }

    public function document(array $subject, int $checkId, int $documentId): object
    {
        $check = $this->check($subject, $checkId);
        $document = DB::table('platform.provider_documents')->where('check_id', $checkId)->where('revision', $check->revision)->where('id', $documentId)
            ->whereNull('purged_at')->where('created_at', '>', now()->subDays(90))->first();
        abort_unless($document && Storage::disk('local')->exists($document->path), 404);
        return $document;
    }

    public function decide(array $subject, User $actor, int $checkId, array $data): void
    {
        abort_unless($actor->role === User::ROLE_SUPERADMIN, 403);
        DB::transaction(function () use ($subject, $actor, $checkId, $data) {
            $check = $this->check($subject, $checkId, true);
            abort_unless(in_array($check->code, array_column($this->definitions($subject), 'code'), true), 422);
            if ($data['state'] === 'REVOKED') abort_unless($check->state === 'APPROVED', 409);
            else abort_unless($check->state === 'PENDING', 409, 'La revisión ya fue decidida.');
            if ($data['state'] === 'APPROVED') {
                abort_unless(isset($data['expires_at']) && CarbonImmutable::parse($data['expires_at'])->isFuture()
                    && CarbonImmutable::parse($data['expires_at'])->lte(now()->addYear()), 422, 'La vigencia debe estar entre hoy y un año.');
                $evidence = DB::table('platform.provider_documents')->where('check_id', $checkId)->where('revision', $check->revision)->whereNull('purged_at')->where('created_at', '>', now()->subDays(90))->get();
                abort_unless($evidence->contains(fn ($document) => Storage::disk('local')->exists($document->path)), 422, 'Revisa al menos un documento vigente.');
            }
            DB::table('platform.provider_checks')->where('id', $checkId)->update(['state' => $data['state'], 'reviewed_by' => $actor->id, 'reviewed_at' => now(),
                'review_note' => $data['reason'], 'expires_at' => $data['state'] === 'APPROVED' ? CarbonImmutable::parse($data['expires_at']) : null, 'updated_at' => now()]);
            $this->audit($checkId, $check->revision, $actor->id, 'DECIDED', $check->state, $data['state'], $data['reason']);
        });
    }

    public function prune(): int
    {
        $count = 0;
        foreach (DB::table('platform.provider_documents')->whereNull('purged_at')->where('created_at', '<=', now()->subDays(90))->cursor() as $document) {
            Storage::disk('local')->delete($document->path);
            if (Storage::disk('local')->exists($document->path)) continue;
            DB::table('platform.provider_documents')->where('id', $document->id)->update(['purged_at' => now(), 'path' => '', 'name' => 'Documento eliminado']);
            $count++;
        }
        return $count;
    }

    private function check(array $subject, int $checkId, bool $lock = false): object
    {
        $check = DB::table('platform.provider_checks')->where('subject_key', $subject['key'])->where('id', $checkId)->when($lock, fn ($q) => $q->lockForUpdate())->first();
        abort_unless($check, 404);
        return $check;
    }

    private function audit(int $checkId, int $revision, ?int $actor, string $action, ?string $from, string $to, ?string $reason = null): void
    {
        DB::table('platform.provider_review_events')->insert(['check_id' => $checkId, 'revision' => $revision, 'actor_id' => $actor, 'action' => $action,
            'from_state' => $from, 'to_state' => $to, 'reason' => $reason, 'created_at' => now()]);
    }
}
