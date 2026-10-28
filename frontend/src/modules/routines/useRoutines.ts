import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { clientAppointmentsService } from "@/services/booking/clientAppointmentsService";
import { routineService } from "@/modules/routines/routineService";
import type { ClientAppointment } from "@/composables/appointments/types";
import type {
  BookingRoutine,
  RoutinePreview,
  RoutinesResult,
} from "@/modules/routines/types";

// COMPOSABLE
export const useRoutines = (): RoutinesResult => {
  // SERVICES
  const { t } = useTranslation("growth");
  // STATE
  const [routines, setRoutines] = useState<BookingRoutine[]>([]);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [previews, setPreviews] = useState<Record<number, RoutinePreview>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void Promise.all([
      routineService.list(controller.signal),
      clientAppointmentsService.getPage(
        { page: 1, per_page: 50 },
        controller.signal,
      ),
    ])
      .then(([items, page]) => {
        if (controller.signal.aborted) return;
        setRoutines(items);
        setAppointments(
          page.data.filter(
            (item) => !["CANCELADA", "NO_ASISTIO"].includes(item.status),
          ),
        );
        setPreviews({});
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("error"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, t]);
  useEffect(() => {
    const expiration = Math.min(
      ...Object.values(previews).map((item) =>
        new Date(item.expires_at).getTime(),
      ),
    );
    if (!Number.isFinite(expiration)) return;
    const timer = window.setTimeout(
      () =>
        setPreviews((current) =>
          Object.fromEntries(
            Object.entries(current).filter(
              ([, item]) => new Date(item.expires_at).getTime() > Date.now(),
            ),
          ),
        ),
      Math.max(0, expiration - Date.now() + 10),
    );
    return () => window.clearTimeout(timer);
  }, [previews]);
  // ACTIONS
  const mutate = async (action: () => Promise<object>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      setRevision((current) => current + 1);
    } catch {
      setError(t("error"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const preview = async (id: number) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await routineService.preview(id);
      setPreviews((current) => ({ ...current, [id]: result }));
    } catch {
      setError(t("error"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    data: { routines, appointments, previews },
    request: {
      loading,
      busy,
      error,
      reload: () => setRevision((current) => current + 1),
    },
    actions: {
      pause: (routine) =>
        mutate(() =>
          routineService.status(
            routine.id,
            routine.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
          ),
        ),
      preview,
      skip: (id) => mutate(() => routineService.skip(id)),
      attach: (id, appointmentId) =>
        mutate(() => routineService.attach(id, appointmentId)),
    },
  };
};
