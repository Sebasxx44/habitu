import { httpService } from "@/services/auth/authService";
import type {
  BookingLink,
  DistributionContext,
  DistributionSettings,
  LinkForm,
} from "@/modules/distribution/types";

// SERVICES
export const distributionService = {
  context: (id: string, signal: AbortSignal) =>
    httpService.get<{ data: DistributionContext }>(
      `/v2/distribution${id ? `?business_id=${id}` : ""}`,
      { signal },
    ),
  create: (businessId: number, form: LinkForm) =>
    httpService.post<{ data: BookingLink }>("/v2/distribution/links", {
      business_id: businessId,
      ...form,
      service_id: Number(form.service_id) || null,
      branch_id: Number(form.branch_id) || null,
      resource_id: Number(form.resource_id) || null,
      professional_id: Number(form.professional_id) || null,
      promo_code: form.promo_code || null,
    }),
  settings: (id: number, settings: DistributionSettings) =>
    httpService.put(`/v2/distribution/${id}/settings`, settings),
  remove: (id: string) => httpService.delete(`/v2/distribution/links/${id}`),
};
