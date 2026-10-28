// TYPES
export interface AchievementBadge {
  id: number;
  name: string;
  description: string | null;
  required_points: number;
}
export interface GamificationStats {
  total_xp: number;
  level: number;
  next_level_xp: number;
  badges: {
    id: number;
    badge_id: number;
    badge: AchievementBadge;
    earned_at: string;
  }[];
  recent_xp: {
    id: number;
    points: number;
    action: string;
    description: string | null;
    created_at: string;
  }[];
}
export interface LeaderboardEntry {
  user_id: number;
  rank: number;
  total_points: number;
  user?: { name: string };
}
export type RankingPeriod = "WEEK" | "MONTH" | "YEAR";
