import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { httpService } from "@/services/auth/authService";
import type {
  AvailabilityAlert,
  AvailabilityAlertsResponse,
  AvailabilityAlertsState,
} from "@/modules/marketplace/alerts/types";

// COMPOSABLE
export const useAvailabilityAlerts = (): AvailabilityAlertsState => {
  const realtimeRevision = useRealtimeRevision(["waitlist","availability"]);
  // STATE
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [records, setRecords] = useState<{
    userId: number;
    items: AvailabilityAlert[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const removed = useRef(new Set<number>());

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const cancel = async (id: number): Promise<void> => {
    if (
      lock.current ||
      userId === null ||
      !records?.items.some((item) => item.id === id)
    )
      return;
    const session = httpService.getSessionRevision();
    lock.current = true;
    setPendingId(id);
    setFailed(false);
    setCompleted(false);
    try {
      await httpService.post<{ success: boolean; data: null }>(
        `/v2/waitlist/${id}/cancel`,
      );
      if (!mounted.current || session !== httpService.getSessionRevision())
        return;
      removed.current.add(id);
      setRecords((current) =>
        current
          ? {
              ...current,
              items: current.items.filter((item) => item.id !== id),
            }
          : null,
      );
      setCompleted(true);
    } catch {
      if (mounted.current && session === httpService.getSessionRevision())
        setFailed(true);
    } finally {
      lock.current = false;
      if (mounted.current) setPendingId(null);
    }
  };

  // EFFECTS
  useEffect(() => {
    mounted.current = true;
    window.addEventListener("focus", refresh);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    removed.current.clear();
    setCompleted(false);
    setFailed(false);
  }, [userId]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError(false);
    if (userId === null) {
      setRecords(null);
      setLoading(false);
      return () => abort.abort();
    }
    httpService
      .get<AvailabilityAlertsResponse>("/v2/waitlist", { signal: abort.signal })
      .then((response) => {
        if (!abort.signal.aborted)
          setRecords({
            userId,
            items: response.data.filter(
              (item) => !removed.current.has(item.id),
            ),
          });
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [userId, revision, realtimeRevision]);

  // RETURN
  return {
    listing: {
      items: records?.userId === userId ? records.items : [],
      loading,
      error,
      refresh,
    },
    cancellation: { pendingId, failed, completed, cancel },
  };
};
