import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
// TYPES
export interface EarningsTransaction {
  id: number;
  amount: number | string;
  type: string;
  description: string | null;
  status?: string;
  created_at: string;
}
export interface EarningsSummary {
  period: { start: string; end: string; days: number };
  period_earnings: number;
  period_completed_services: number;
  period_rating: number | null;
  series: { date: string; earnings: number; completed_services: number }[];
  balance: number | string;
  currency: string;
  available_balance: number | string;
  hold_balance: number | string;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  completed_services: number;
  rating: number;
  recent_transactions: EarningsTransaction[];
  reserved_for_withdrawal: string;
  transfer_provider_enabled: boolean;
  withdrawals: WithdrawalRecord[];
}
export interface WithdrawalRecord {
  id: number;
  amount: string;
  status: string;
  bank_name: string;
  bank_account_last4: string;
  created_at: string;
  processed_at: string | null;
  provider_confirmed: boolean;
  can_cancel: boolean;
}
export interface WithdrawalHistoryState {
  cancellation: { busyId: number | null; error: string | null };
  actions: { cancel: (id: number) => Promise<void> };
}
export interface EarningsResponse {
  success: boolean;
  data: EarningsSummary;
  message: string;
}
export interface WithdrawalResponse {
  success: boolean;
  message: string;
}
export interface WithdrawalForm {
  amount: string;
  bankAccount: string;
  bankName: string;
}
export interface EarningsState {
  filters: { range: DateRangeValue; setRange: (range: DateRangeValue) => void };
  earnings: {
    data: EarningsSummary | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
}
export interface WithdrawalState {
  withdrawal: {
    open: boolean;
    form: WithdrawalForm;
    submitting: boolean;
    error: string | null;
    setOpen: (open: boolean) => void;
    setField: (field: keyof WithdrawalForm, value: string) => void;
    submit: () => Promise<void>;
  };
}
