import { httpService } from "@/services/auth/authService";
import type { BenefitResponse } from "@/modules/benefits/types";
import type {
  AdminCardDetail,
  AdminBenefitsData,
  BenefitAdminKind,
  BenefitWrite,
} from "@/modules/benefits/adminTypes";

// SERVICE
export const adminBenefitsApi = {
  list: async (
    businessId: string,
    cardsPage: number,
    signal?: AbortSignal,
  ): Promise<AdminBenefitsData> =>
    (
      await httpService.get<BenefitResponse<AdminBenefitsData>>(
        "/v2/benefits/admin",
        {
          params: {
            business_id: businessId || undefined,
            cards_page: cardsPage,
          },
          signal,
        },
      )
    ).data,
  save: async (
    kind: BenefitAdminKind,
    id: number | null,
    data: BenefitWrite,
  ): Promise<void> => {
    if (id) await httpService.put(`/v2/benefits/admin/${kind}/${id}`, data);
    else await httpService.post(`/v2/benefits/admin/${kind}`, data);
  },
  archive: async (kind: BenefitAdminKind, id: number, businessId: number): Promise<void> => {
    await httpService.delete(`/v2/benefits/admin/${kind}/${id}`, { params: { business_id: businessId } });
  },
  card: async (id: number): Promise<AdminCardDetail> =>
    (
      await httpService.get<BenefitResponse<AdminCardDetail>>(
        `/v2/benefits/admin/cards/${id}`,
      )
    ).data,
  stamp: async (id: number, key: string): Promise<void> => {
    await httpService.post(`/v2/benefits/admin/cards/${id}/stamp`, {
      idempotency_key: key,
    });
  },
  consume: async (code: string): Promise<void> => {
    await httpService.post("/v2/benefits/admin/vouchers/consume", { code });
  },
};
