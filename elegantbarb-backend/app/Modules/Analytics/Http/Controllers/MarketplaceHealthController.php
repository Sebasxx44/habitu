<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Analytics\Services\AnalyticsPeriod;
use App\Modules\Analytics\Services\MarketplaceHealth;
use App\Modules\Business\Models\Business;
use App\Services\BusinessAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

final class MarketplaceHealthController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $data = $request->validate(['business_id' => 'nullable|integer', 'city_id' => 'nullable|integer|min:1', 'category_id' => 'nullable|integer|min:1', 'hour' => 'nullable|integer|min:0|max:23']);
        $user = $request->user();
        abort_unless(in_array($user->role, [User::ROLE_ADMIN, User::ROLE_SUPERADMIN], true) && $user->hasEffectivePermission('reports.view'), 403);
        $businessId = $data['business_id'] ?? null;
        if ($user->role !== User::ROLE_SUPERADMIN) {
            abort_unless($businessId, 403);
            abort_unless(app(BusinessAccessService::class)->canAccess($user, Business::findOrFail($businessId)), 403);
        }
        $filters = array_filter(array_intersect_key($data, array_flip(['city_id', 'category_id', 'hour'])), fn ($value) => $value !== null);
        $overview = app(MarketplaceHealth::class)->overview(AnalyticsPeriod::fromRequest($request), $businessId, $filters);
        $businesses = Business::query()->when($businessId, fn ($query) => $query->whereKey($businessId));
        $overview['segments'] = [
            'categories' => DB::table('platform.business_categories')->whereIn('id', (clone $businesses)->select('business_category_id'))->orderBy('name')->get(['id', 'name']),
            'cities' => \Illuminate\Support\Facades\Schema::hasTable('public.cities') ? DB::table('public.cities')->whereIn('id', DB::table('business.business_branches')->whereIn('business_id', (clone $businesses)->select('id'))->whereNotNull('city_id')->select('city_id'))->orderBy('name')->get(['id', 'name']) : [],
        ];
        return response()->json($overview)->header('Cache-Control', 'private, no-store');
    }

    public function classifications(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        $data = $request->validate(['search' => 'nullable|string|max:120']);
        return response()->json(['data' => Business::query()->when($data['search'] ?? null, fn ($query, $search) => $query->where('name', 'ILIKE', '%'.$search.'%'))
            ->orderBy('id')->paginate(30, ['id', 'name', 'analytics_environment'])]);
    }

    public function classify(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        $data = $request->validate(['environment' => 'required|in:UNCLASSIFIED,PRODUCTION,DEMO,TEST', 'reason' => 'required|string|min:8|max:500']);
        $business = DB::transaction(fn () => $this->classifyLocked($request->user(), $id, $data));
        return response()->json(['data' => $business->only(['id', 'name', 'analytics_environment'])]);
    }

    public function operations(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        return response()->json(app(\App\Modules\Analytics\Services\OperationalDiagnostics::class)->snapshot())->header('Cache-Control', 'private, no-store');
    }

    public function features(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        $data = $request->validate(['scope' => 'required|in:global,business,category', 'scope_id' => 'nullable|integer|min:1']);
        $scope = $data['scope'];
        $scopeId = $data['scope_id'] ?? null;
        $flags = DB::table('platform.feature_flags')->whereIn('name', ['group_coordination', 'routines'])->orderBy('name')->get(['name', 'enabled', 'user_percentage']);
        $overrides = $scope !== 'global' && $scopeId ? DB::table('platform.feature_flag_scopes')->where('scope_type', $scope)->where('scope_id', $scopeId)->get()->keyBy('flag') : collect();
        return response()->json(['flags' => $flags->map(fn ($flag) => ['name' => $flag->name, 'enabled' => $flag->enabled, 'user_percentage' => $flag->user_percentage,
            'override' => $overrides->get($flag->name)?->enabled]), 'categories' => DB::table('platform.business_categories')->orderBy('name')->get(['id', 'name'])])
            ->header('Cache-Control', 'private, no-store');
    }

    public function updateFeature(Request $request, string $flag): JsonResponse
    {
        abort_unless($request->user()->role === User::ROLE_SUPERADMIN, 403);
        abort_unless(in_array($flag, ['group_coordination', 'routines'], true), 404);
        $data = $request->validate(['scope' => 'required|in:global,business,category', 'scope_id' => 'required_unless:scope,global|nullable|integer|min:1',
            'enabled' => 'present|nullable|boolean', 'user_percentage' => 'required_if:scope,global|integer|min:0|max:100', 'reason' => 'required|string|min:8|max:500']);
        if ($data['scope'] === 'global') abort_if($data['enabled'] === null, 422, 'El estado global debe ser explícito.');
        else abort_unless(DB::table($data['scope'] === 'business' ? 'business.businesses' : 'platform.business_categories')->where('id', $data['scope_id'])->exists(), 422, 'Alcance inválido.');
        DB::transaction(fn () => $this->updateFeatureLocked($request->user(), $flag, $data));
        Cache::forget("feature.{$flag}");
        return response()->json(['saved' => true]);
    }

    private function updateFeatureLocked(User $user, string $flag, array $data): void
    {
        $record = DB::table('platform.feature_flags')->where('name', $flag)->lockForUpdate()->first();
        abort_unless($record, 404);
        $scopeId = $data['scope'] === 'global' ? null : $data['scope_id'];
        $identity = ['flag' => $flag, 'scope_type' => $data['scope'], 'scope_id' => $scopeId];
        if ($data['scope'] === 'global') {
            $previous = ['enabled' => $record->enabled, 'user_percentage' => $record->user_percentage];
            $next = ['enabled' => $data['enabled'], 'user_percentage' => $data['user_percentage']];
            DB::table('platform.feature_flags')->where('id', $record->id)->update($next + ['updated_at' => now()]);
        } else {
            $previous = ['enabled' => DB::table('platform.feature_flag_scopes')->where($identity)->value('enabled')];
            $next = ['enabled' => $data['enabled']];
            if ($data['enabled'] === null) DB::table('platform.feature_flag_scopes')->where($identity)->delete();
            else DB::table('platform.feature_flag_scopes')->updateOrInsert($identity, $next + ['updated_at' => now(), 'created_at' => now()]);
        }
        DB::table('platform.audit_logs')->insert(['user_id' => $user->id, 'user_name' => $user->name, 'user_role' => $user->role,
            'business_id' => $data['scope'] === 'business' ? $scopeId : null, 'action' => 'CHANGE_FEATURE_FLAG', 'entity_type' => 'feature_flag', 'entity_id' => $record->id,
            'old_values' => json_encode($identity + $previous), 'new_values' => json_encode($identity + $next), 'reason' => $data['reason'], 'created_at' => now()]);
    }

    private function classifyLocked(User $user, int $id, array $data): Business
    {
        $business = Business::lockForUpdate()->findOrFail($id);
        $previous = $business->analytics_environment;
        $business->forceFill(['analytics_environment' => $data['environment']])->save();
        DB::table('platform.audit_logs')->insert(['user_id' => $user->id, 'user_name' => $user->name, 'user_role' => $user->role, 'business_id' => $id,
            'action' => 'CLASSIFY_ANALYTICS', 'entity_type' => 'business', 'entity_id' => $id, 'old_values' => json_encode(['analytics_environment' => $previous]),
            'new_values' => json_encode(['analytics_environment' => $data['environment']]), 'reason' => $data['reason'], 'created_at' => now()]);
        return $business;
    }
}
