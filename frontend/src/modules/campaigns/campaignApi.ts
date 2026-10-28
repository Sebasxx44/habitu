import { isAxiosError } from "axios";
import { httpService } from "@/services/auth/authService";
import type {
  CampaignAnalytics,
  CampaignAudience,
  CampaignDraft,
  CampaignFilters,
  CampaignOptions,
  CampaignRecord,
} from "@/modules/campaigns/types";

// SERVICE
export const campaignApi = {
  list: (
    filters: CampaignFilters,
    signal: AbortSignal,
  ): Promise<CampaignRecord[]> =>
    httpService.get("/campaigns", { params: filters, signal }),
  options: (signal: AbortSignal): Promise<CampaignOptions> =>
    httpService.get("/campaigns/options", { signal }),
  get: (id: string, signal: AbortSignal): Promise<CampaignRecord> =>
    httpService.get(`/campaigns/${id}`, { signal }),
  stats: (id: string, signal: AbortSignal): Promise<CampaignAnalytics> =>
    httpService.get(`/campaigns/${id}/stats`, { signal }),
  audience: (
    form: CampaignDraft,
    signal: AbortSignal,
  ): Promise<CampaignAudience> =>
    httpService.get("/campaigns/audience-preview", {
      params: {
        business_id: form.business_id,
        target_role: form.target_role,
        target_ids: form.target_ids,
        segment: form.segment,
      },
      signal,
    }),
  save: (
    id: string | undefined,
    form: CampaignDraft,
  ): Promise<CampaignRecord> =>
    id
      ? httpService.put(`/campaigns/${id}`, form)
      : httpService.post("/campaigns", form),
  send: (id: number): Promise<{ message: string; campaign: CampaignRecord }> =>
    httpService.post(`/campaigns/${id}/send`),
  remove: (id: number): Promise<{ message: string }> =>
    httpService.delete(`/campaigns/${id}`),
};
export const campaignError = (
  error: Error | object,
  fallback: string,
): string => {
  if (
    isAxiosError<{
      message?: string;
      error?: string;
      errors?: Record<string, string[]>;
    }>(error)
  ) {
    const data = error.response?.data;
    return (
      (data?.errors && Object.values(data.errors).flat().join(" ")) ||
      data?.message ||
      data?.error ||
      fallback
    );
  }
  return fallback;
};
