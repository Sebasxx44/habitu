import type {
  WalletAccount,
  WalletTransactions,
  WalletTransaction,
} from "@/composables/wallet/types";
import type { CheckoutOrder, WompiConfig } from "@/modules/payments/types";

// CONTRACTS
export interface WalletFilters {
  type: WalletTransaction["type"] | "";
  from: string;
  to: string;
}
export interface WalletActivityState {
  account: {
    wallet: WalletAccount | null;
    loading: boolean;
    error: boolean;
    reload: () => void;
  };
  history: {
    page: WalletTransactions;
    loading: boolean;
    error: boolean;
    filters: WalletFilters;
    change: (value: Partial<WalletFilters>) => void;
    goTo: (page: number) => void;
  };
  payments: {
    orders: CheckoutOrder[];
    error: boolean;
    returned: CheckoutOrder | null;
    checking: boolean;
    returnError: boolean;
    check: () => void;
  };
}
export interface WalletCheckoutState {
  config: { value: WompiConfig | null; loading: boolean; failed: boolean; retry: () => void };
  selection: {
    provider: "wompi" | "mercadopago";
    amount: string;
    value: number;
    valid: boolean;
    validAmount: boolean;
    setProvider: (value: "wompi" | "mercadopago") => void;
    setAmount: (value: string) => void;
  };
  submission: { busy: boolean; error: boolean; submit: () => Promise<void> };
}

export interface WalletOrderActions {
  state: { openingId: string | null; errorId: string | null };
  actions: { resume: (order: CheckoutOrder) => Promise<void> };
}
