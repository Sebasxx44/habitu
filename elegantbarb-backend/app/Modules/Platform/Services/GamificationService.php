<?php

namespace App\Modules\Platform\Services;

use App\Core\DTOs\ServiceResponse;
use App\Modules\Platform\Models\Badge;
use App\Modules\Platform\Models\GamificationXP;
use App\Modules\Platform\Models\UserBadge;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GamificationService
{
    public function awardXP(int $userId, int $points, string $action, ?string $description = null, ?object $source = null): ServiceResponse
    {
        if (! $source instanceof \Illuminate\Database\Eloquent\Model || ! $source->exists || $points <= 0) {
            return ServiceResponse::error('Los puntos requieren una operación de origen válida.', null, 422);
        }
        return DB::transaction(function () use ($userId, $points, $action, $description, $source) {
            \App\Models\User::lockForUpdate()->findOrFail($userId);
            $identity = ['user_id' => $userId, 'action' => $action, 'source_type' => $source::class, 'source_id' => $source->id];
            $existing = GamificationXP::where($identity)->first();
            if ($existing) return ServiceResponse::success($existing, 'La operación ya había otorgado puntos.');
            $xp = GamificationXP::create($identity + ['points' => $points, 'description' => $description]);
            $this->checkAndAwardBadges($userId);
            return ServiceResponse::success($xp, 'XP awarded', 201);
        });
    }

    public function getUserStats(int $userId): ServiceResponse
    {
        $totalXp = GamificationXP::where('user_id', $userId)->sum('points');
        $level = $this->calculateLevel($totalXp);

        $badges = UserBadge::where('user_id', $userId)
            ->with('badge')
            ->orderBy('earned_at', 'desc')
            ->get();

        $recentXp = GamificationXP::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return ServiceResponse::success([
            'total_xp' => (int) $totalXp,
            'level' => $level,
            'next_level_xp' => $this->nextLevelXp($level),
            'badges' => $badges,
            'recent_xp' => $recentXp,
        ], 'Stats retrieved');
    }

    public function getLeaderboard(?int $businessId = null, string $period = 'MONTH', string $type = 'GLOBAL'): ServiceResponse
    {
        $now = now();
        $start = match ($period) {
            'WEEK' => $now->copy()->startOfWeek(),
            'YEAR' => $now->copy()->startOfYear(),
            'ALL_TIME' => Carbon::createFromTimestamp(0),
            default => $now->copy()->startOfMonth(),
        };
        $end = match ($period) {
            'WEEK' => $now->copy()->endOfWeek(),
            'YEAR' => $now->copy()->endOfYear(),
            'ALL_TIME' => $now->copy()->endOfCentury(),
            default => $now->copy()->endOfMonth(),
        };

        $query = GamificationXP::select('user_id', DB::raw('SUM(points) as total_points'))
            ->whereBetween('created_at', [$start, $end]);
        if ($businessId) {
            // XP has no business column: only attributable booking sources belong in a business ranking.
            $query->whereIn('source_type', [\App\Models\Appointment::class, \App\Modules\Booking\Models\Appointment::class])
                ->whereIn('source_id', \App\Modules\Booking\Models\Appointment::where('business_id', $businessId)->select('id'));
        }
        if ($type !== 'GLOBAL') {
            $query->whereHas('user', fn ($users) => $users->where('role', $type));
        }
        $entries = $query->with('user:id,name')->groupBy('user_id')->orderByDesc('total_points')->orderBy('user_id')
            ->limit(50)->get()->values()->map(fn ($entry, $index) => [
                'user_id' => $entry->user_id, 'rank' => $index + 1,
                'total_points' => (int) $entry->total_points, 'user' => $entry->user,
            ]);

        return ServiceResponse::success($entries, 'Leaderboard retrieved');
    }

    public function getAvailableBadges(): ServiceResponse
    {
        $badges = Badge::active()->orderBy('required_points')->get();
        return ServiceResponse::success($badges, 'Badges retrieved');
    }

    private function calculateLevel(int $totalXp): int
    {
        // Simple leveling: level = sqrt(xp / 100)
        return (int) floor(sqrt(max(0, $totalXp) / 100)) + 1;
    }

    private function nextLevelXp(int $currentLevel): int
    {
        return (int) pow($currentLevel, 2) * 100;
    }

    private function checkAndAwardBadges(int $userId): void
    {
        $totalXp = GamificationXP::where('user_id', $userId)->sum('points');

        $badges = Badge::active()
            ->where('required_points', '<=', $totalXp)
            ->whereNotIn('id', function ($q) use ($userId) {
                $q->select('badge_id')->from('platform.user_badges')->where('user_id', $userId);
            })
            ->get();

        foreach ($badges as $badge) {
            UserBadge::create([
                'user_id' => $userId,
                'badge_id' => $badge->id,
                'earned_at' => now(),
            ]);
        }
    }

}
