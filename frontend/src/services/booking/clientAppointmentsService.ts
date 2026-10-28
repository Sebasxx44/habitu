import { httpService } from "@/services/auth/authService";
import type { BookingApiResponse } from "@/composables/booking/types";
import type {
  AppointmentPage,
  AppointmentDetail,
  AppointmentTimelineEvent,
  AppointmentPayment,
  AppointmentPageQuery,
  ClientAppointment,
  RawClientAppointment,
  ReviewRequest,
} from "@/composables/appointments/types";

// CONSTANTS
const statusLabels: Record<string, ClientAppointment["status"]> = {
  PENDING: "PENDIENTE",
  CONFIRMED: "CONFIRMADA",
  COMPLETED: "COMPLETADA",
  CANCELLED: "CANCELADA",
  NO_SHOW: "NO_ASISTIO",
  RESCHEDULED: "PENDIENTE",
};

// TRANSFORMERS
const normalize = (appointment: RawClientAppointment): ClientAppointment => ({
  ...appointment,
  date: appointment.date.slice(0, 10),
  time: (appointment.start_time || appointment.time || "").slice(0, 5),
  status: statusLabels[appointment.status] || "PENDIENTE",
  price: Number(appointment.final_price ?? appointment.price),
  base_price: Number(appointment.price),
  barber: appointment.professional || appointment.barber,
  barberShop: appointment.business || appointment.barberShop,
});

// SERVICES
export const clientAppointmentsService = {
  detail: async (id: number, signal?: AbortSignal): Promise<AppointmentDetail> => {
    const response = await httpService.get<BookingApiResponse<RawClientAppointment & { timeline?: AppointmentTimelineEvent[]; payments?: AppointmentPayment[]; duration_minutes?: number; created_at?: string; notes?: string }>>(`/v2/appointments/${id}`, { signal });
    return { ...normalize(response.data), timeline: response.data.timeline ?? [], payments: response.data.payments ?? [], duration_minutes: response.data.duration_minutes, created_at: response.data.created_at, notes: response.data.notes };
  },
  getPage: async (
    query: AppointmentPageQuery,
    signal: AbortSignal,
  ): Promise<AppointmentPage> => {
    const response = await httpService.get<
      BookingApiResponse<
        Omit<AppointmentPage, "data"> & { data: RawClientAppointment[] }
      >
    >("/v2/appointments", { params: query, signal });
    return { ...response.data, data: response.data.data.map(normalize) };
  },
  review: async (request: ReviewRequest): Promise<void> => {
    await httpService.post("/v2/reviews", request);
  },
  cancel: async (id: number, reason: string): Promise<void> => {
    await httpService.post(`/v2/appointments/${id}/cancel`, { reason });
  },
  reschedule: async (
    id: number,
    date: string,
    time: string,
  ): Promise<ClientAppointment> => {
    const response = await httpService.post<
      BookingApiResponse<RawClientAppointment>
    >(`/v2/appointments/${id}/reschedule`, { date, start_time: time });
    return normalize(response.data);
  },
};
