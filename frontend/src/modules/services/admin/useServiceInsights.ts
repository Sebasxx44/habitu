import { useCallback, useEffect, useRef, useState } from "react";
import { serviceConfigurationApi } from "@/modules/services/serviceConfigurationApi";
import type { ServiceStats } from "@/modules/services/bookingPolicyTypes";
import type { ServiceInsightsState } from "@/modules/services/admin/types";

// COMPOSABLE
export const useServiceInsights = (serviceId: number): ServiceInsightsState => {
  // STATE
  const [data, setData] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  // ACTIONS
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const next = await serviceConfigurationApi.stats(serviceId);
      if (request === sequence.current) setData(next);
    } catch {
      if (request === sequence.current)
        setError("No pudimos cargar las estadísticas de este servicio.");
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [serviceId]);

  // LIFECYCLE
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh]);

  // EXPOSE
  return { insights: { data, loading, error }, actions: { refresh } };
};
