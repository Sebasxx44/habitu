import { httpService } from "@/services/auth/authService";
import type {
  BenefitResponse,
  BenefitsCatalog,
  MembershipCheckout,
  WompiConfig,
} from "@/modules/benefits/types";

// SERVICE
export const benefitsApi = {
  catalog: async (
    query: string,
    businessId: string,
    signal?: AbortSignal,
  ): Promise<BenefitsCatalog> =>
    (
      await httpService.get<BenefitResponse<BenefitsCatalog>>("/v2/benefits", {
        params: { q: query || undefined, business_id: businessId || undefined },
        signal,
      })
    ).data,
  join: async (id: number): Promise<void> => {
    await httpService.post(`/v2/benefits/programs/${id}/join`, {});
  },
  redeem: async (id: number, key: string): Promise<void> => {
    await httpService.post(`/loyalty/mine/${id}/redeem`, {
      idempotency_key: key,
    });
  },
  subscribe: async (id: number): Promise<void> => {
    await httpService.post(`/v2/benefits/plans/${id}/subscribe`, {});
  },
  cancel: async (id: number): Promise<void> => {
    await httpService.post(`/v2/benefits/memberships/${id}/cancel`, {});
  },
  paymentConfig: async (): Promise<WompiConfig> =>
    (await httpService.get<BenefitResponse<WompiConfig>>("/v2/wompi/config"))
      .data,
  checkout: async (id: number, key: string): Promise<MembershipCheckout> =>
    (
      await httpService.post<BenefitResponse<MembershipCheckout>>(
        "/v2/wompi/membership",
        { plan_id: id, idempotency_key: key },
      )
    ).data,
  order: async (id: string): Promise<MembershipCheckout> =>
    (
      await httpService.get<BenefitResponse<MembershipCheckout>>(
        `/v2/wompi/orders/${encodeURIComponent(id)}`,
      )
    ).data,
};
