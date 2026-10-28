import { useEffect, useState } from "react";
import { useAuth } from "@/App";
import { calendarDirectory } from "@/modules/calendar/calendarApi";
import type { Professional } from "@/types/models";

// TYPES
interface CalendarProfessionalsState {
  data: Professional[];
  error: string;
}

// COMPOSABLE
export const useCalendarProfessionals = (): CalendarProfessionalsState => {
  const { user } = useAuth();
  const [data, setData] = useState<Professional[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user?.barber_shop_id) return;
    const controller = new AbortController();
    calendarDirectory<Professional>(
      "/v2/professionals",
      user.barber_shop_id,
      controller.signal,
    )
      .then((items) => {
        if (!controller.signal.aborted) setData(items);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No se pudo cargar el equipo para reasignar la reserva.");
      });
    return () => controller.abort();
  }, [user?.barber_shop_id]);
  return { data, error };
};
