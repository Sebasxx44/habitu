import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { clientAppointmentsService } from "@/services/booking/clientAppointmentsService";
import type { ClientAppointment } from "@/composables/appointments/types";
import type { RequestedAppointmentState } from "@/modules/agenda/types";

// COMPOSABLE
export const useRequestedAppointment = (
  onSelect: (appointment: ClientAppointment) => void,
): RequestedAppointmentState => {
  // STATE
  const [params] = useSearchParams();
  const [error, setError] = useState(false);
  // COMPUTED
  const requested = params.get("appointment_id");
  // LIFECYCLE
  useEffect(() => {
    if (!requested || !/^\d+$/.test(requested)) return;
    const controller = new AbortController();
    setError(false);
    void clientAppointmentsService
      .detail(Number(requested), controller.signal)
      .then((appointment) => {
        if (!controller.signal.aborted) onSelect(appointment);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [requested, onSelect]);
  // RETURN
  return { error };
};
