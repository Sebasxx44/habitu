import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { analyticsService } from "@/modules/analytics/analyticsService";
import {
  initialAnalyticsFilters,
  validAnalyticsRange,
} from "@/modules/analytics/period";
import type {
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsState,
} from "@/modules/analytics/types";

// COMPOSABLE
export const useAnalyticsOverview = (
  businessId: number | null,
): AnalyticsState => {
  const realtimeRevision = useRealtimeRevision(["analytics","appointments","wallet","businesses","branches","services","professionals","clients","benefits","on-demand"]);
  // STATE
  const { t } = useTranslation("analytics");
  const [filters, setFilters] = useState<AnalyticsFilters>(
    initialAnalyticsFilters,
  );
  const [result, setResult] = useState<{
    key: string;
    data: AnalyticsOverview;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify({ businessId, filters });

  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    if (
      (businessId !== null &&
        (!Number.isSafeInteger(businessId) || businessId < 1)) ||
      (filters.preset === "custom" &&
        !validAnalyticsRange(filters.start, filters.end))
    ) {
      setError(t("rangeError"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    analyticsService
      .overview(businessId, filters, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setResult({ key, data });
      })
      .catch((failure) => {
        if (!abort.signal.aborted)
          setError(
            isAxiosError(failure) &&
              [403, 404].includes(failure.response?.status ?? 0)
              ? t("forbidden")
              : t("loadError"),
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [key, revision, t, realtimeRevision]);

  // ACTIONS
  const update = <K extends keyof AnalyticsFilters>(
    property: K,
    value: AnalyticsFilters[K],
  ) => setFilters((current) => ({ ...current, [property]: value }));
  return {
    overview: {
      data: result?.key === key ? result.data : null,
      loading,
      error,
      refresh: () => setRevision((current) => current + 1),
    },
    filters: { value: filters, update, setRange: (range) => setFilters((current) => ({ ...current, ...range })) },
  };
};
