import { httpService } from "@/services/auth/authService";
import type {
  AdForm,
  AdRecord,
  AdsDirectory,
  AdsResponse,
} from "@/modules/ads/types";

// SERVICES
export const adsService = {
  directory: (signal: AbortSignal) =>
    httpService.get<AdsResponse<AdsDirectory>>("/v2/ads/manage", { signal }),
  save: (id: number | null, form: AdForm) => {
    const payload = {
      ...form,
      business_id: Number(form.business_id),
      budget: form.budget || null,
      image_url: form.image_url || null,
      impression_limit: form.impression_limit
        ? Number(form.impression_limit)
        : null,
      click_limit: form.click_limit ? Number(form.click_limit) : null,
    };
    return id
      ? httpService.put<AdsResponse<AdRecord>>(`/v2/ads/${id}`, payload)
      : httpService.post<AdsResponse<AdRecord>>("/v2/ads", payload);
  },
  status: (id: number, status: "ACTIVE" | "PAUSED") =>
    httpService.post<AdsResponse<AdRecord>>(`/v2/ads/${id}/status`, {
      status,
    }),
  remove: (id: number) =>
    httpService.delete<AdsResponse<null>>(`/v2/ads/${id}`),
  moderate: (id: number, decision: "APPROVED" | "REJECTED", reason: string) =>
    httpService.post<AdsResponse<AdRecord>>(`/v2/ads/${id}/moderate`, {
      decision,
      reason: reason || null,
    }),
};
