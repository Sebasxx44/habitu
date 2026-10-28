import { httpService } from "@/services/auth/authService";
import type {
  IncidentCategory,
  ReservationConversation,
  ReservationIncident,
  ReservationMessage,
  ReservationPin,
  ReservationReference,
  ReservationSupport,
} from "@/modules/reservation-support/types";

// TYPES
interface ApiResponse<T> {
  data: T;
}

// HELPERS
const path = ({ kind, id }: ReservationReference) =>
  `/v2/reservations/${kind}/${id}`;

// SERVICES
export const reservationSupportService = {
  get: async (reference: ReservationReference) =>
    (
      await httpService.get<ApiResponse<ReservationSupport>>(path(reference), {
        headers: { "Cache-Control": "no-cache" },
      })
    ).data,
  issue: async (reference: ReservationReference) =>
    (
      await httpService.post<ApiResponse<ReservationPin>>(
        `${path(reference)}/check-in/pin`,
        {},
      )
    ).data,
  verify: async (
    reference: ReservationReference,
    pin: string,
    reason?: string,
  ) =>
    httpService.post(`${path(reference)}/check-in/verify`, {
      pin: pin || null,
      manual_reason: reason || undefined,
    }),
  report: async (
    reference: ReservationReference,
    category: IncidentCategory,
    description: string,
  ) =>
    httpService.post(`${path(reference)}/incidents`, { category, description }),
  resolve: async (
    reference: ReservationReference,
    incident: ReservationIncident,
    resolution: string,
    responseDueAt?: string,
  ) =>
    httpService.put(`${path(reference)}/incidents/${incident.id}`, {
      status: resolution ? "RESOLVED" : "IN_REVIEW",
      resolution: resolution || null,
      response_due_at: responseDueAt || undefined,
    }),
  open: async (reference: ReservationReference) =>
    (
      await httpService.post<ApiResponse<ReservationConversation>>(
        `${path(reference)}/conversation`,
        {},
      )
    ).data,
  messages: async (id: number) =>
    (
      await httpService.get<ApiResponse<ReservationMessage[]>>(
        `/v2/chat/conversations/${id}`,
        { headers: { "Cache-Control": "no-cache" } },
      )
    ).data,
  send: async (id: number, content: string, attachments: number[]) =>
    httpService.post(`/v2/chat/conversations/${id}/messages`, {
      content,
      attachments,
      message_type: attachments.length ? "FILE" : "TEXT",
    }),
  upload: async (id: number, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return (
      await httpService.post<ApiResponse<{ id: number }>>(
        `/v2/chat/conversations/${id}/attachments`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    ).data;
  },
  download: async (id: number, attachmentId: number) => {
    const file = await httpService.get<Blob>(
      `/v2/chat/conversations/${id}/attachments/${attachmentId}`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservation-attachment-${attachmentId}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
