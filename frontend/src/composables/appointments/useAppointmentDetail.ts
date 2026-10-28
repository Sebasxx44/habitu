import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { clientAppointmentsService } from "@/services/booking/clientAppointmentsService";
import type {
  AppointmentDetail,
  AppointmentDetailState,
  AppointmentModal,
  ClientAppointment,
  ReviewRequest,
} from "@/composables/appointments/types";

// COMPOSABLE
export const useAppointmentDetail = (id: number): AppointmentDetailState => {
  const realtimeRevision = useRealtimeRevision(["appointments", "payments", "wallet"]);
  // STATE
  const [record, setData] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const loadedId = useRef<number | null>(null);
  const data = record?.id === id ? record : null;
  const [modal, choose] = useState<AppointmentModal>(null);

  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    if (loadedId.current !== id) setLoading(true);
    setError(null);
    if (!Number.isSafeInteger(id) || id < 1) {
      setData(null);
      setError("La cita solicitada no es válida.");
      setLoading(false);
      return;
    }
    clientAppointmentsService
      .detail(id, abort.signal)
      .then((appointment) => {
        if (!abort.signal.aborted) {
          loadedId.current = id;
          setData(appointment);
        }
      })
      .catch((failure) => {
        if (!abort.signal.aborted) {
          loadedId.current = null;
          setData(null);
          setError(
            isAxiosError(failure) &&
              [403, 404].includes(failure.response?.status ?? 0)
              ? "Esta cita no está disponible o no pertenece a tu cuenta."
              : "No pudimos cargar la cita. Revisa tu conexión e inténtalo de nuevo.",
          );
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, revision, realtimeRevision]);

  // ACTIONS
  const reload = () => setRevision((value) => value + 1);
  const cancel = async (reason: string): Promise<ClientAppointment> => {
    if (!data?.allowed_actions?.cancel)
      throw new Error("Esta cita no permite cancelación.");
    await clientAppointmentsService.cancel(id, reason);
    reload();
    return { ...data, status: "CANCELADA" };
  };
  const reschedule = async (
    date: string,
    time: string,
  ): Promise<ClientAppointment> => {
    if (!data?.allowed_actions?.reschedule)
      throw new Error("Esta cita no permite reprogramación.");
    const updated = await clientAppointmentsService.reschedule(id, date, time);
    reload();
    return updated;
  };
  const review = async (request: ReviewRequest): Promise<void> => {
    if (!data?.allowed_actions?.review)
      throw new Error("Esta cita no permite una reseña.");
    await clientAppointmentsService.review(request);
    reload();
  };
  return {
    detail: { data, loading, error },
    selection: { modal, choose },
    actions: { reload, cancel, reschedule, review },
  };
};
