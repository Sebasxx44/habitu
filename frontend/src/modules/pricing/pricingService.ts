import { httpService } from "@/services/auth/authService";
import type {
  PricingContext,
  PricingRule,
  PricingRuleInput,
  PricingSimulation,
  PricingSimulationInput,
} from "@/modules/pricing/types";
// SERVICES
export const pricingService = {
  context: (
    businessId: number | null,
    signal?: AbortSignal,
  ): Promise<PricingContext> =>
    httpService.get(
      `/v2/dynamic-pricing/context${businessId ? `?business_id=${businessId}` : ""}`,
      { signal },
    ),
  rules: (
    businessId: number,
    signal?: AbortSignal,
  ): Promise<{ data: PricingRule[] }> =>
    httpService.get(`/v2/dynamic-pricing/rules?business_id=${businessId}`, {
      signal,
    }),
  save: (
    data: PricingRuleInput,
    id?: number,
  ): Promise<{ rule: PricingRule }> =>
    id
      ? httpService.put(`/v2/dynamic-pricing/rules/${id}`, data)
      : httpService.post("/v2/dynamic-pricing/rules", data),
  remove: (id: number, businessId: number): Promise<{ deleted: boolean }> =>
    httpService.delete(
      `/v2/dynamic-pricing/rules/${id}?business_id=${businessId}`,
    ),
  simulate: (data: PricingSimulationInput): Promise<PricingSimulation> =>
    httpService.post("/v2/dynamic-pricing/calculate", data),
};
