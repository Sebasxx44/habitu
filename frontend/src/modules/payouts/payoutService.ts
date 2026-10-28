import { httpService } from "@/services/auth/authService";
import type { PayoutAttempt, PayoutContext } from "@/modules/payouts/types";

// SERVICES
export const payoutService = {
  index: (signal: AbortSignal) =>
    httpService.get<{ data: PayoutContext }>("/v2/payout-sandbox", { signal }),
  prepare: (id: number) =>
    httpService.post<{ data: PayoutAttempt }>(
      `/v2/payout-sandbox/withdrawals/${id}/prepare`,
      { sandbox_acknowledged: true },
    ),
  submit: (id: string) =>
    httpService.post<{ data: PayoutAttempt }>(
      `/v2/payout-sandbox/attempts/${id}/submit`,
      { sandbox_acknowledged: true },
    ),
  reconcile: (id: string) =>
    httpService.post<{ data: PayoutAttempt }>(
      `/v2/payout-sandbox/attempts/${id}/reconcile`,
    ),
};
