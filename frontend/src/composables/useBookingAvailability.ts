import { useBusinessAvailabilityRealtime } from '@/modules/realtime/useBusinessAvailabilityRealtime';
import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { bookingAvailabilityService } from "@/services/booking/availabilityService";
import type {
  BookingApiError,
  BookingAvailability,
  BookingAvailabilityState,
  BookingRequest,
} from "@/composables/booking/types";

// COMPOSABLE
export const useBookingAvailability = (
  request: BookingRequest | null,
): BookingAvailabilityState => {
  const realtimeRevision = useRealtimeRevision(["availability","appointments","branches","services","professionals"]);
  useBusinessAvailabilityRealtime(request?.business_id);
  // STATE
  const [result, setResult] = useState<{
    key: string;
    data: BookingAvailability;
  } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const key = request ? JSON.stringify(request) : "";

  // EFFECTS
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const query: BookingRequest = JSON.parse(key);
    setPendingKey(key);
    setError(null);
    bookingAvailabilityService
      .get(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const response = isAxiosError<BookingApiError>(error)
          ? error.response?.data
          : undefined;
        const validation = response?.errors
          ? Object.values(response.errors).flat()[0]
          : undefined;
        setError({
          key,
          message:
            validation ||
            response?.error ||
            response?.message ||
            "No se pudieron consultar los horarios.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setPendingKey(null);
      });
    return () => controller.abort();
  }, [key, revision, realtimeRevision]);

  // ACTIONS
  const reload = () => {
    setResult(null);
    setRevision((value) => value + 1);
  };

  // RETURN
  return {
    availability: {
      slots: result?.key === key ? result.data.slots : [],
      loading:
        !!key &&
        (pendingKey === key || (result?.key !== key && error?.key !== key)),
      error: error?.key === key ? error.message : null,
      timezone: result?.key === key ? result.data.timezone : "America/Bogota",
    },
    actions: { reload },
  };
};
