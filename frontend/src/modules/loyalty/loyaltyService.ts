import { httpService } from "@/services/auth/authService";
import type {
  LoyaltyAccount,
  RedemptionResponse,
} from "@/modules/loyalty/types";

// SERVICES
export const getLoyaltyAccount = (
  signal: AbortSignal,
): Promise<LoyaltyAccount> =>
  httpService.get<LoyaltyAccount>("/loyalty/mine", { signal });

export const redeemLoyaltyCard = (
  id: number,
  idempotencyKey: string,
): Promise<RedemptionResponse> =>
  httpService.post<RedemptionResponse>(`/loyalty/mine/${id}/redeem`, {
    idempotency_key: idempotencyKey,
  });
