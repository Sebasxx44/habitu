import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { connectionService } from "@/modules/connections/service";
import type {
  CalendarConnection,
  CalendarConnectionState,
} from "@/modules/connections/types";

// COMPOSABLE
export const useCalendarConnection = (): CalendarConnectionState => {
  // COMPOSABLES
  const { user } = useAuth();
  // STATE
  const [status, setStatus] = useState<CalendarConnection | null>(null);
  const [professionalId, setProfessionalId] = useState<number | null>(null);
  const [professionals, setProfessionals] = useState<
    { id: number; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // COMPUTED
  const isProfessional = user?.role === "PROFESSIONAL";
  // ACTIONS
  const refresh = useCallback(async () => {
    if (!isProfessional && !professionalId) return;
    setLoading(true);
    try {
      setStatus(await connectionService.calendarStatus(professionalId));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [professionalId, isProfessional]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(false);
    try {
      await operation();
      await refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const connect = () =>
    run(async () => {
      const result = await connectionService.calendarAuth(professionalId);
      window.location.assign(result.auth_url);
    });
  const disconnect = () =>
    run(async () => {
      await connectionService.calendarDisconnect(professionalId);
    });
  const sync = () =>
    run(async () => {
      await connectionService.calendarSync(professionalId);
    });
  const exportAppointments = () =>
    run(async () => {
      await connectionService.calendarExport(professionalId);
    });
  // LIFECYCLE
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (isProfessional) return;
    let active = true;
    void connectionService
      .professionals()
      .then((result) => {
        if (active) {
          setProfessionals(result);
          setProfessionalId(result[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [isProfessional]);
  // RETURN
  return {
    data: { status, loading, busy, error, professionals },
    selection: { professionalId, setProfessionalId },
    actions: { refresh, connect, disconnect, sync, exportAppointments },
  };
};
