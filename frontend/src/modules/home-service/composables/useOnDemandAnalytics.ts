import { useCallback, useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import { initialDateRange } from "@/modules/analytics/dateRange";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import type {
  OnDemandAnalyticsData,
  OnDemandAnalyticsState,
} from "@/modules/home-service/types";

// COMPOSABLE
export const useOnDemandAnalytics = (): OnDemandAnalyticsState => {
  // STATE
  const [range, setRange] = useState<DateRangeValue>(() =>
    initialDateRange("30"),
  );
  const [data, setData] = useState<OnDemandAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const realtimeRevision = useRealtimeRevision(["on-demand"]);

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    httpService
      .get<{ data: OnDemandAnalyticsData }>("/v2/on-demand/analytics", {
        signal: controller.signal,
        params: { start_date: range.start, end_date: range.end },
      })
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos cargar las métricas de servicios a domicilio.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range, revision, realtimeRevision]);

  // RETURN
  return {
    overview: { data, loading, error, refresh },
    filters: { range, setRange },
  };
};
