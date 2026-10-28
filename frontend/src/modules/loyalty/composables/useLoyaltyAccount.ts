import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useCallback, useEffect, useState } from "react";
import { getLoyaltyAccount } from "@/modules/loyalty/loyaltyService";
import type {
  LoyaltyAccount,
  LoyaltyAccountState,
} from "@/modules/loyalty/types";

export const useLoyaltyAccount = (): LoyaltyAccountState => {
  const realtimeRevision = useRealtimeRevision(["loyalty","benefits"]);
  // STATE
  const [data, setData] = useState<LoyaltyAccount | null>(null);
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
    getLoyaltyAccount(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos consultar tus recompensas. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, realtimeRevision]);

  // PUBLIC API
  return { account: { data, loading, error, refresh } };
};
