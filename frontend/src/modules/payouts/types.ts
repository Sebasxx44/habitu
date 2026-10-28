export interface PayoutAttempt {
  id: string;
  withdrawal_id: number;
  state: string;
  reference: string;
  provider_status: string | null;
  provider_payout_id: string | null;
  resolution: string | null;
  first_submitted_at: string | null;
  real_transfer_confirmed: false;
}
export interface PayoutWithdrawal {
  id: number;
  user_id: number;
  amount: string;
  status: string;
  created_at: string;
}
export interface PayoutContext {
  sandbox_enabled: boolean;
  commercial_enabled: false;
  withdrawals: PayoutWithdrawal[];
  attempts: PayoutAttempt[];
}
export interface PayoutWorkspace {
  listing: {
    data: PayoutContext | null;
    loading: boolean;
    error: string;
    refresh: () => void;
  };
  actions: {
    busy: boolean;
    error: string;
    prepare: (id: number) => Promise<void>;
    submit: (id: string) => Promise<void>;
    reconcile: (id: string) => Promise<void>;
  };
}
