import { useCallback, useEffect, useState } from "react";
import { reservationSupportService } from "@/modules/reservation-support/service";
import type {
  ReservationReference,
  ReservationSupport,
  SupportState,
} from "@/modules/reservation-support/types";

// COMPOSABLE
export const useReservationSupport = ({
  kind,
  id,
}: ReservationReference): SupportState => {
  // STATE
  const [support, setSupport] = useState<ReservationSupport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ACTIONS
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSupport(await reservationSupportService.get({ kind, id }));
      setError(null);
    } catch {
      setError("load");
    } finally {
      setLoading(false);
    }
  }, [kind, id]);
  const report: SupportState["actions"]["report"] = async (
    category,
    description,
  ) => {
    try {
      await reservationSupportService.report(
        { kind, id },
        category,
        description,
      );
      await refresh();
      return true;
    } catch {
      setError("save");
      return false;
    }
  };
  const resolve: SupportState["actions"]["resolve"] = async (
    incident,
    resolution,
    dueAt,
  ) => {
    try {
      await reservationSupportService.resolve(
        { kind, id },
        incident,
        resolution,
        dueAt,
      );
      await refresh();
      return true;
    } catch {
      setError("save");
      return false;
    }
  };
  // LIFECYCLE
  useEffect(() => {
    void refresh();
  }, [refresh]);
  // RETURN
  return {
    data: { support, loading, error },
    actions: { refresh, report, resolve },
  };
};
