import { useEffect, useMemo, useState } from "react";
import { clientsService } from "@/modules/clients/services/clientsService";
import {
  appointmentIsUpcoming,
  clientAppointmentDate,
} from "@/modules/clients/utils";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import type {
  ClientAppointmentRecord,
  ClientProfileState,
  ClientRecord,
} from "@/modules/clients/types";

// COMPOSABLE
export const useClientProfile = (
  id: number,
  businessId?: number | null,
  includeHistory = true,
): ClientProfileState => {
  // STATE
  const realtimeRevision = useRealtimeRevision(["clients", "appointments"]);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [appointments, setAppointments] = useState<ClientAppointmentRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(includeHistory);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] =
    useState<ClientProfileState["history"]["filter"]>("all");
  const [limit, setLimit] = useState(8);
  const profileRevision = includeHistory ? realtimeRevision : 0;

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setClient(null);
    if (!businessId) {
      setLoading(false);
      setError("No se encontró un negocio asociado a tu cuenta.");
      return () => controller.abort();
    }
    clientsService
      .get(id, controller.signal)
      .then((record) => {
        if (controller.signal.aborted) return;
        if (record.business_id !== businessId) {
          setError("Este cliente no pertenece a tu negocio.");
          return;
        }
        setClient(record);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "No pudimos cargar este cliente. Puede haber sido eliminado.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, businessId, revision, profileRevision]);

  useEffect(() => {
    const controller = new AbortController();
    setAppointments([]);
    setHistoryError(null);
    if (!includeHistory || !businessId) {
      setHistoryLoading(false);
      return () => controller.abort();
    }
    setHistoryLoading(true);
    clientsService
      .history(id, businessId, controller.signal)
      .then((records) => {
        if (!controller.signal.aborted) setAppointments(records);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setHistoryError("No pudimos cargar las reservas de este cliente.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [id, businessId, includeHistory, revision, realtimeRevision]);

  // COMPUTED
  const metrics = useMemo(() => {
    const completed = appointments.filter(
      (appointment) => appointment.status === "COMPLETED",
    );
    return {
      completed: completed.length,
      spent: completed.reduce(
        (total, appointment) =>
          total + Number(appointment.final_price ?? appointment.price ?? 0),
        0,
      ),
      upcoming: appointments.filter(appointmentIsUpcoming).length,
      lastVisit: completed[0] ? clientAppointmentDate(completed[0]) : null,
    };
  }, [appointments]);
  const filtered = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          filter === "all" ||
          (filter === "upcoming" && appointmentIsUpcoming(appointment)) ||
          (filter === "completed" && appointment.status === "COMPLETED") ||
          (filter === "cancelled" &&
            ["CANCELLED", "NO_SHOW"].includes(appointment.status)),
      ),
    [appointments, filter],
  );

  // RETURN
  return {
    record: {
      client,
      loading,
      error,
      reload: () => setRevision((value) => value + 1),
    },
    history: {
      appointments,
      visible: filtered.slice(0, limit),
      filter,
      setFilter: (value) => {
        setFilter(value);
        setLimit(8);
      },
      loading: historyLoading,
      error: historyError,
      loadMore: () => setLimit((value) => value + 8),
      hasMore: filtered.length > limit,
    },
    metrics,
  };
};
