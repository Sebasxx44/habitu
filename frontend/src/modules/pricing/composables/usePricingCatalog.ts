import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { pricingService } from "@/modules/pricing/pricingService";
import type {
  PricingCatalogState,
  PricingContext,
} from "@/modules/pricing/types";
// COMPOSABLE
export const usePricingCatalog = (): PricingCatalogState => {
  const realtimeRevision = useRealtimeRevision(["pricing","services","branches","businesses"]);
  // STATE
  const { t } = useTranslation("pricing");
  const [id, select] = useState<number | null>(null);
  const [data, setData] = useState<PricingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, refresh] = useState(0);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    pricingService
      .context(id, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision, t, realtimeRevision]);
  return {
    catalog: {
      data,
      loading,
      error,
      reload: () => refresh((value) => value + 1),
    },
    selection: { id: data?.business?.id ?? null, select },
  };
};
