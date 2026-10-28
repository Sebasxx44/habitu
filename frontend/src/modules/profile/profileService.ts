import { httpService } from "@/services/auth/authService";
import type {
  AccountProfile,
  AccountPreferences,
  ProfileContact,
  ProfileEmail,
  ProfilePassword,
} from "@/modules/profile/types";
// SERVICES
export const profileService = {
  get: (signal?: AbortSignal): Promise<AccountProfile> =>
    httpService.get("/profile", { signal }),
  contact: (input: ProfileContact): Promise<AccountProfile> =>
    httpService.put("/profile", input),
  preferences: (input: AccountPreferences): Promise<AccountProfile> =>
    httpService.put("/profile/preferences", input),
  email: (input: ProfileEmail): Promise<AccountProfile> =>
    httpService.put("/profile/email", input),
  password: (input: ProfilePassword): Promise<{ updated: boolean }> =>
    httpService.put("/profile/password", input),
  avatar: (file: File): Promise<AccountProfile> => {
    const data = new FormData();
    data.append("avatar", file);
    return httpService.post("/profile/avatar", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  removeAvatar: (): Promise<AccountProfile> =>
    httpService.delete("/profile/avatar"),
};
