import { httpService } from "@/services/auth/authService";
import type {
  CalendarConnection,
  PushConnection,
} from "@/modules/connections/types";

// TYPES
interface ApiResponse<T> {
  data: T;
}

// CONSTANTS
export const PUSH_DEVICE_TOKEN_KEY = "habitu_push_device_token";
export const PUSH_DEVICE_USER_KEY = "habitu_push_device_user";

// SERVICES
export const connectionService = {
  calendarStatus: async (professionalId: number | null) =>
    (
      await httpService.get<ApiResponse<CalendarConnection>>(
        "/v2/google-calendar/status",
        {
          params: { professional_id: professionalId ?? undefined },
          headers: { "Cache-Control": "no-cache" },
        },
      )
    ).data,
  calendarAuth: async (professionalId: number | null) =>
    (
      await httpService.get<ApiResponse<{ auth_url: string }>>(
        "/v2/google-calendar/auth-url",
        { params: { professional_id: professionalId ?? undefined } },
      )
    ).data,
  calendarDisconnect: async (professionalId: number | null) =>
    httpService.post("/v2/google-calendar/disconnect", {
      professional_id: professionalId ?? undefined,
    }),
  calendarSync: async (professionalId: number | null) =>
    httpService.post("/v2/google-calendar/sync-busy", {
      professional_id: professionalId ?? undefined,
    }),
  calendarExport: async (professionalId: number | null) =>
    httpService.post("/v2/google-calendar/sync", {
      professional_id: professionalId ?? undefined,
    }),
  professionals: async () => {
    const result = (
      await httpService.get<
        ApiResponse<
          | { id: number; name: string }[]
          | { data: { id: number; name: string }[] }
        >
      >("/v2/professionals", { params: { per_page: 100 } })
    ).data;
    return Array.isArray(result) ? result : result.data;
  },
  pushStatus: async () =>
    (
      await httpService.get<ApiResponse<PushConnection>>("/v2/push/status", {
        headers: { "Cache-Control": "no-cache" },
      })
    ).data,
  registerPush: async (
    token: string,
    transactional: boolean,
    promotions: boolean,
  ) =>
    httpService.post("/v2/push/register", {
      token,
      platform: "web",
      transactional_enabled: transactional,
      promotions_enabled: promotions,
    }),
  unregisterPush: async (token: string) =>
    httpService.post("/v2/push/unregister", { token }),
};
