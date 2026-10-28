import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { t } from 'i18next'
import { useCallback, useEffect, useState } from "react";
import { initialDateRange } from "@/modules/analytics/dateRange";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { getDashboardOverview } from "@/modules/dashboard/dashboardService";
import type {
  DashboardOverview,
  DashboardState,
} from "@/modules/dashboard/types";

export const useDashboardOverview = (): DashboardState => {
  const realtimeRevision = useRealtimeRevision(["appointments","wallet","businesses","branches","clients","professionals","services","on-demand","benefits"]);
  // STATE
  const [range, setRange] = useState<DateRangeValue>(initialDateRange);
  const [currency, setCurrency] = useState("");
  const [result, setResult] = useState<{ key: string; data: DashboardOverview } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const key = JSON.stringify({ range, currency });
  const data = result?.key === key ? result.data : null;
  const currencies = [...new Set([currency, data?.currency ?? "", ...(data?.currencies ?? [])].filter(Boolean))];

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getDashboardOverview(range, controller.signal, currency)
      .then((response) => {
        if (!controller.signal.aborted) setResult({ key, data: response });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t('dashboard.loadErrorHint'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [key, revision, realtimeRevision]);

  // PUBLIC API
  return {
    overview: { data, loading: loading || (error === null && result?.key !== key), error, refresh },
    filters: { range, setRange, currency, setCurrency, currencies },
  };
};
