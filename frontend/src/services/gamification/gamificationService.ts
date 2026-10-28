import { httpService } from '@/services/auth/authService'
import type { AchievementBadge, GamificationStats, LeaderboardEntry, RankingPeriod } from '@/modules/gamification/types'

interface ApiResult<T> { data: T; success: boolean; message: string }

export const gamificationService = {
  getStats: async () => (await httpService.get<ApiResult<GamificationStats>>('/v2/gamification/stats')).data,
  getLeaderboard: async (period: RankingPeriod = 'MONTH') =>
    (await httpService.get<ApiResult<LeaderboardEntry[]>>(`/v2/gamification/leaderboard?period=${period}&type=GLOBAL`)).data,
  getBadges: async () => (await httpService.get<ApiResult<AchievementBadge[]>>('/v2/gamification/badges')).data,
}
