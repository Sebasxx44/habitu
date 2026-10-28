import { httpService } from "@/services/auth/authService";
import type {
  BookingRoutine,
  RoutineDraft,
  RoutinePreview,
} from "@/modules/routines/types";

// SERVICES
export const routineService = {
  list: async (signal: AbortSignal): Promise<BookingRoutine[]> =>
    (
      await httpService.get<{ data: BookingRoutine[] }>("/v2/routines", {
        headers: { "Cache-Control": "no-cache" },
        signal,
      })
    ).data,
  create: (draft: RoutineDraft): Promise<object> =>
    httpService.post("/v2/routines", draft),
  future: (id: number, draft: RoutineDraft): Promise<object> =>
    httpService.put(`/v2/routines/${id}`, {
      name: draft.name,
      start_date: draft.start_date,
      start_time: draft.start_time,
      interval_weeks: draft.interval_weeks,
    }),
  status: (id: number, status: BookingRoutine["status"]): Promise<object> =>
    httpService.put(`/v2/routines/${id}`, { status }),
  preview: async (id: number): Promise<RoutinePreview> =>
    (
      await httpService.get<{ data: RoutinePreview }>(
        `/v2/routines/${id}/preview`,
        { headers: { "Cache-Control": "no-cache" } },
      )
    ).data,
  skip: (id: number): Promise<object> =>
    httpService.post(`/v2/routines/occurrences/${id}/skip`, {}),
  attach: (id: number, appointmentId: number): Promise<object> =>
    httpService.post(`/v2/routines/occurrences/${id}/attach`, {
      appointment_id: appointmentId,
    }),
};
