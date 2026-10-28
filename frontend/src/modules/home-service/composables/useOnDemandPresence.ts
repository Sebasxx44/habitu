import { useEffect, useState } from "react";
import { onDemandService } from "@/services/ondemand/ondemandService";
import type { OnDemandPresenceState } from "@/modules/home-service/types";

// COMPOSABLE
export const useOnDemandPresence = (
  refresh: () => Promise<void>,
): OnDemandPresenceState => {
  // STATE
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // ACTIONS
  const toggle = async () => {
    setBusy(true);
    try {
      const result = await onDemandService.setPresence(!paused);
      setPaused(result.is_paused);
      setError(false);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const reject = async (id: number) => {
    setBusy(true);
    try {
      await onDemandService.reject(id);
      setError(false);
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // LIFECYCLE
  useEffect(() => {
    void onDemandService
      .presence()
      .then((result) => setPaused(result.is_paused))
      .catch(() => setError(true));
  }, []);
  // RETURN
  return { data: { paused, busy, error }, actions: { toggle, reject } };
};
