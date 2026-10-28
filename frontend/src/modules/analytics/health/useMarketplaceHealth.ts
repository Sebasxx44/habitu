import { useEffect, useState } from "react";
import { healthService } from "@/modules/analytics/health/healthService";
import type {
  HealthOverview,
  HealthPanelProps,
  HealthResult,
  HealthSegments,
} from "@/modules/analytics/health/types";

// COMPOSABLE
export const useMarketplaceHealth = ({
  businessId,
  filters,
}: HealthPanelProps): HealthResult => {
  // STATE
  const [value, setValue] = useState<HealthSegments>({
    city: "",
    category: "",
    hour: "",
  });
  const [data, setData] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setData(null);
    void healthService
      .overview(businessId, filters, value, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, filters, value, revision]);
  // EXPOSE
  return {
    data,
    request: {
      loading,
      error,
      reload: () => setRevision((current) => current + 1),
    },
    segments: {
      value,
      update: (key, next) =>
        setValue((current) => ({ ...current, [key]: next })),
    },
  };
};
