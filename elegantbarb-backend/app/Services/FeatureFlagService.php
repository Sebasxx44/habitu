<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FeatureFlagService
{
    public function isEnabled(string $flag, ?int $userId = null, ?int $businessId = null, ?int $categoryId = null): bool
    {
        $record = Cache::remember("feature.{$flag}", 300, fn () => DB::table('platform.feature_flags')->where('name', $flag)->first());
        if (! $record?->enabled) return false;
        if ($businessId || $categoryId) {
            $scope = DB::table('platform.feature_flag_scopes')->where('flag', $flag)
                ->where(fn ($query) => $query->where(fn ($q) => $q->where('scope_type', 'business')->where('scope_id', $businessId ?? 0))
                    ->orWhere(fn ($q) => $q->where('scope_type', 'category')->where('scope_id', $categoryId ?? 0)))
                ->orderBy('scope_type')->first();
            if ($scope && ! $scope->enabled) return false;
        }
        return $record->user_percentage >= 100 || ($userId !== null && ($userId % 100) < $record->user_percentage);
    }

    public function enable(string $flag, int $percentage = 100): void
    {
        DB::table('platform.feature_flags')->updateOrInsert(
            ['name' => $flag],
            ['enabled' => true, 'user_percentage' => $percentage, 'updated_at' => now()]
        );
        Cache::forget("feature.{$flag}");
    }

    public function disable(string $flag): void
    {
        DB::table('platform.feature_flags')
            ->where('name', $flag)
            ->update(['enabled' => false, 'updated_at' => now()]);
        Cache::forget("feature.{$flag}");
    }
}
