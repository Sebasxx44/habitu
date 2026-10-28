import { useEffect, useState } from "react";
import { healthService } from "@/modules/analytics/health/healthService";
import type {
  OperationalDiagnosticsData,
  OperationalDiagnosticsResult,
} from "@/modules/analytics/health/types";

// COMPOSABLE
export const useOperationalDiagnostics = (): OperationalDiagnosticsResult => {
  // STATE
  const [data, setData] = useState<OperationalDiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void healthService
      .operations(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  // EXPOSE
  return {
    data,
    request: {
      loading,
      error,
      reload: () => setRevision((value) => value + 1),
    },
  };
};
