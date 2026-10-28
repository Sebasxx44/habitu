import { initialDateRange } from "@/modules/analytics/dateRange";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useCallback, useEffect, useState } from "react";
import { getEarnings } from "@/modules/earnings/earningsService";
import type { EarningsState, EarningsSummary } from "@/modules/earnings/types";

export const useEarnings = (): EarningsState => {
  const realtimeRevision = useRealtimeRevision(["appointments","wallet","benefits"]);
  // STATE
  const [range, setRange] = useState<DateRangeValue>(() => initialDateRange("30"));
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    getEarnings(controller.signal, range)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos consultar tus ganancias. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, realtimeRevision, range]);

  // PUBLIC API
  return { filters: { range, setRange }, earnings: { data, loading, error, refresh } };
};
