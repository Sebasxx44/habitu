import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { gamificationService } from "@/services/gamification/gamificationService";
import type {
  AchievementBadge,
  GamificationStats,
  LeaderboardEntry,
  RankingPeriod,
} from "@/modules/gamification/types";

// COMPOSABLE
export const useGamification = () => {
  const realtimeRevision = useRealtimeRevision(["gamification"]);
  // STATE
  const [period, setPeriod] = useState<RankingPeriod>("MONTH");
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [ranking, setRanking] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // EFFECTS
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      gamificationService.getStats(),
      gamificationService.getBadges(),
      gamificationService.getLeaderboard(period),
    ])
      .then(([nextStats, nextBadges, nextRanking]) => {
        if (!active) return;
        setStats(nextStats);
        setBadges(nextBadges);
        setRanking(nextRanking);
      })
      .catch(() => {
        if (active)
          setError("No pudimos cargar tus logros. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, revision, realtimeRevision]);

  // ACTIONS
  const retry = () => setRevision((value) => value + 1);

  // RETURN
  return {
    data: { stats, badges, ranking },
    state: { loading, error },
    filters: { period, setPeriod },
    actions: { retry },
  };
};
