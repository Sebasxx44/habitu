import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { pricingService } from "@/modules/pricing/pricingService";
import type { PricingRule, PricingRulesState } from "@/modules/pricing/types";
// COMPOSABLE
export const usePricingRules = (
  businessId: number | null,
): PricingRulesState => {
  const realtimeRevision = useRealtimeRevision(["pricing","services"]);
  // STATE
  const { t } = useTranslation("pricing");
  const [items, setItems] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  const inFlight = useRef(false);
  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    setItems([]);
    setError("");
    setMutationError("");
    if (!businessId) return;
    setLoading(true);
    pricingService
      .rules(businessId, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setItems(value.data);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(t("loadError"));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [businessId, revision, t, realtimeRevision]);
  // ACTIONS
  const mutate = async (action: () => Promise<object>): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setMutationError("");
    try {
      await action();
      refresh((value) => value + 1);
      return true;
    } catch (failure) {
      setMutationError(
        isAxiosError<{ errors?: Record<string, string[]> }>(failure)
          ? (Object.values(failure.response?.data.errors ?? {}).flat()[0] ??
              t("saveError"))
          : t("saveError"),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    collection: {
      items,
      loading,
      error,
      reload: () => refresh((value) => value + 1),
    },
    mutations: {
      busy,
      error: mutationError,
      save: (data, id) => mutate(() => pricingService.save(data, id)),
      remove: (id) =>
        businessId
          ? mutate(() => pricingService.remove(id, businessId))
          : Promise.resolve(false),
    },
  };
};
