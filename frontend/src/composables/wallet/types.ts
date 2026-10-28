// TYPES
export interface WalletAccount {
  id: number;
  balance: number | string;
  hold_balance: number | string;
  currency: string;
  is_active: boolean;
}
export interface WalletTransaction {
  id: number;
  type: "CREDIT" | "DEBIT" | "CASHBACK" | "REFUND" | "PAYOUT" | "TOPUP";
  amount: number | string;
  description: string;
  created_at: string;
  status?: string;
  balance_before?: number | string;
  balance_after?: number | string;
  payment_method?: string | null;
  external_reference?: string | null;
  source_type?: string | null;
}
export interface WalletTransactions {
  data: WalletTransaction[];
  current_page: number;
  last_page: number;
  total: number;
}
export interface WalletOverview {
  wallet: WalletAccount;
  recent_transactions: WalletTransactions;
}
export interface CheckoutPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}
export interface WalletPaymentMetadata {
  description?: string;
  source_type?: string;
  source_id?: number;
}
export interface WalletState {
  account: {
    wallet: WalletAccount | null;
    transactions: WalletTransaction[];
    loading: boolean;
    error: string | null;
  };
  checkout: {
    customAmount: string;
    selectedQuick: number | null;
    amount: number;
    processing: boolean;
    error: string | null;
  };
  actions: {
    reload: () => Promise<void>;
    setCustomAmount: (amount: string) => void;
    selectAmount: (amount: number) => void;
    topUp: () => Promise<void>;
  };
}
