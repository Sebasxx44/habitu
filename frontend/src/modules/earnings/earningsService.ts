import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { httpService } from "@/services/auth/authService";
import type {
  EarningsResponse,
  WithdrawalForm,
  WithdrawalResponse,
} from "@/modules/earnings/types";

// SERVICES
export const getEarnings = (signal: AbortSignal, range: DateRangeValue): Promise<EarningsResponse> =>
  httpService.get<EarningsResponse>("/v2/earnings/dashboard", { signal, params: { start_date: range.start, end_date: range.end } });
export const cancelWithdrawal = (id: number): Promise<WithdrawalResponse> =>
  httpService.post<WithdrawalResponse>(`/v2/earnings/withdrawals/${id}/cancel`, {});
export const requestWithdrawal = (
  form: WithdrawalForm,
  idempotencyKey: string,
): Promise<WithdrawalResponse> =>
  httpService.post<WithdrawalResponse>("/v2/earnings/withdrawal", {
    amount: form.amount,
    bank_account: form.bankAccount.trim(),
    bank_name: form.bankName.trim(),
    idempotency_key: idempotencyKey,
  });
