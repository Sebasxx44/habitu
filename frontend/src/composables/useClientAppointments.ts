import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { appointmentService } from "@/services/business/businessService";
import { clientAppointmentsService } from "@/services/booking/clientAppointmentsService";
import type {
  AppointmentPage,
  AppointmentView,
  ClientAppointment,
  ClientAppointmentsState,
  ReviewRequest,
} from "@/composables/appointments/types";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";

// COMPOSABLE
export const useClientAppointments = (
  range: DateRangeValue,
  onChanged: () => void,
): ClientAppointmentsState => {
  const realtimeRevision = useRealtimeRevision(["appointments","wallet"]);
  // STATE
  const [view, setView] = useState<AppointmentView>("upcoming");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AppointmentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [review, selectReview] = useState<ClientAppointment | null>(null);
  const [cancel, selectCancel] = useState<ClientAppointment | null>(null);
  const [reschedule, selectReschedule] = useState<ClientAppointment | null>(
    null,
  );

  // EFFECTS
  useEffect(() => {
    setPage(1);
  }, [range.start, range.end, realtimeRevision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    appointmentService
      .getPage(
        {
          view,
          page,
          per_page: 10,
          ...(view === "upcoming"
            ? {}
            : {
                date_from: range.start,
                date_to: range.end,
              }),
        },
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          if (page > data.last_page) setPage(data.last_page);
          else setResult(data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos cargar tus citas. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [view, page, range.start, range.end, revision, realtimeRevision]);

  // ACTIONS
  const refresh = () => {
    setRevision((value) => value + 1);
    onChanged();
  };
  const submitReview = async (request: ReviewRequest) => {
    await clientAppointmentsService.review(request);
    refresh();
  };
  const cancelAppointment = async (
    reason: string,
  ): Promise<ClientAppointment> => {
    if (!cancel) throw new Error("Selecciona una cita.");
    await clientAppointmentsService.cancel(cancel.id, reason);
    refresh();
    return { ...cancel, status: "CANCELADA" };
  };
  const rescheduleAppointment = async (
    date: string,
    time: string,
  ): Promise<ClientAppointment> => {
    if (!reschedule) throw new Error("Selecciona una cita.");
    const updated = await clientAppointmentsService.reschedule(
      reschedule.id,
      date,
      time,
    );
    refresh();
    return updated;
  };

  // RETURN
  return {
    list: {
      data: result?.data ?? [],
      loading,
      error,
      total: result?.total ?? 0,
      lastPage: result?.last_page ?? 1,
      refresh,
    },
    filters: {
      view,
      page,
      setPage,
      setView: (value) => {
        setView(value);
        setPage(1);
      },
    },
    selection: {
      review,
      cancel,
      reschedule,
      selectReview,
      selectCancel,
      selectReschedule,
    },
    actions: {
      submitReview,
      cancel: cancelAppointment,
      reschedule: rescheduleAppointment,
    },
  };
};
