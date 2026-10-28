import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";

import type { AnalyticsBusinessSelection } from "@/modules/analytics/types";

// COMPOSABLE
export const useAnalyticsBusinesses = (
  initialId?: number | null,
): AnalyticsBusinessSelection => {
  const realtimeRevision = useRealtimeRevision(["businesses"]);
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(initialId ?? null);
  useEffect(() => {
    const controller = new AbortController();
    httpService
      .get<{ id: number; name: string }[]>("/analytics/businesses", {
        signal: controller.signal,
      })
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [realtimeRevision]);
  return {
    businesses: { items, loading, failed },
    selection: {
      id:
        items.find((item) => item.id === selected)?.id ?? items[0]?.id ?? null,
      select: setSelected,
    },
  };
};
