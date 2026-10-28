import { useRef, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type {
  BookingApiResponse,
  BookingRequest,
} from "@/composables/booking/types";

// TYPES
export interface AvailabilityAlertState {
  status: { busy: boolean; active: boolean; failed: boolean };
  actions: { subscribe: () => Promise<void>; cancel: () => Promise<void> };
}

// COMPOSABLE
export const useAvailabilityAlert = (
  request: BookingRequest | null,
  from: string,
  to: string,
): AvailabilityAlertState => {
  // STATE
  const [saved, setSaved] = useState<{ key: string; id: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  const key = JSON.stringify([request, from, to]);
  const active = saved?.key === key;

  // ACTIONS
  const subscribe = async () => {
    if (!request || lock.current || active) return;
    lock.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const { date, ...selection } = request;
      const result = await httpService.post<BookingApiResponse<{ id: number }>>(
        "/v2/waitlist",
        {
          ...selection,
          preferred_date: date,
          preferred_time_start: from || undefined,
          preferred_time_end: to || undefined,
        },
      );
      setSaved({ key, id: result.data.id });
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!active || !saved || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await httpService.post(`/v2/waitlist/${saved.id}/cancel`);
      setSaved(null);
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  // RETURN
  return { status: { busy, active, failed }, actions: { subscribe, cancel } };
};
