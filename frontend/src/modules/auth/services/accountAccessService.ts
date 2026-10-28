import { httpService } from "@/services/auth/authService";
import type { AuthResponse } from "@/types/auth";
import type { AccountAccessFields } from "@/modules/auth/types";

// SERVICES
export const accountAccessService = {
  configuration: (): Promise<{ google_client_id: string | null }> =>
    httpService.get("/auth/config"),
  register: async (fields: AccountAccessFields): Promise<void> => {
    const version = httpService.getSessionRevision();
    const response = await httpService.post<AuthResponse>("/auth/register", {
      name: fields.name.trim(),
      email: fields.email.trim(),
      password: fields.password,
      password_confirmation: fields.confirmation,
    });
    if (version !== httpService.getSessionRevision())
      throw new Error("Session changed");
    httpService.setToken(response.token, response.expires_in);
  },
  request: (email: string): Promise<{ message: string }> =>
    httpService.post("/auth/forgot-password", { email: email.trim() }),
  reset: (
    fields: AccountAccessFields,
    token: string,
  ): Promise<{ message: string }> =>
    httpService.post("/auth/reset-password", {
      email: fields.email.trim(),
      token,
      password: fields.password,
      password_confirmation: fields.confirmation,
    }),
};
