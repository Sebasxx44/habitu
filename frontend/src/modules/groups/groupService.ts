import { httpService } from "@/services/auth/authService";
import type { BookingGroup, GroupPayload } from "@/modules/groups/types";

// SERVICES
export const groupService = {
  list: (signal: AbortSignal): Promise<{ data: BookingGroup[] }> =>
    httpService.get("/v2/groups", { signal }),
  create: (data: GroupPayload): Promise<{ data: BookingGroup }> =>
    httpService.post("/v2/groups", data),
  join: (token: string): Promise<{ data: BookingGroup }> =>
    httpService.post("/v2/groups/join", { token }),
  invite: (id: number): Promise<{ data: { invite_token: string } }> =>
    httpService.post(`/v2/groups/${id}/invitation`, {}),
  update: (
    id: number,
    data: { status?: "CLOSED"; appointment_id?: number },
  ): Promise<{ data: BookingGroup }> =>
    httpService.put(`/v2/groups/${id}`, data),
  respond: (
    id: number,
    response: "CONFIRMED" | "DECLINED",
    option_id?: number,
  ): Promise<{ data: BookingGroup }> =>
    httpService.post(`/v2/groups/${id}/response`, { response, option_id }),
};
