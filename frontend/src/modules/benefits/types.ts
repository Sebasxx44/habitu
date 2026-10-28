import type {
  CheckoutOrder,
  WompiConfig as PaymentConfig,
} from "@/modules/payments/types";
// DOMAIN
export type BenefitsTab =
  "all" | "promotions" | "loyalty" | "memberships" | "mine";
export interface BenefitBusiness {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  currency?: string;
}
export interface BenefitReference {
  id: number;
  name: string;
}
export interface BenefitPromotion {
  id: number;
  title: string;
  description: string | null;
  business: BenefitBusiness;
  type: string;
  discount: number;
  code: string | null;
  starts_at: string;
  expires_at: string;
  min_purchase: number;
  max_discount: number | null;
  remaining_uses: number | null;
  remaining_for_you: number | null;
  eligible: boolean;
  services: { id: number; name: string; type: string; discount: number }[];
  url: string;
}
export interface BenefitCard {
  id: number;
  stamps: number;
  required: number;
  available: boolean;
  status: string;
}
export interface BenefitProgram {
  id: number;
  name: string;
  description: string | null;
  business: BenefitBusiness;
  reward: string;
  required: number;
  expires_at: string | null;
  service: BenefitReference | null;
  professional: BenefitReference | null;
  card: BenefitCard | null;
}
export interface BenefitPlan {
  id: number;
  business_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number | string;
  currency: string;
  billing_cycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  appointments_included: number;
  included_services: number[] | null;
  eligible_services?: BenefitReference[];
  discount_percentage: number | string;
  benefits: string[] | null;
  is_active: boolean;
  business: BenefitBusiness;
  sort_order?: number;
}
export interface BenefitMembership {
  id: number;
  membership_plan_id: number;
  status: string;
  starts_at: string;
  ends_at: string;
  appointments_used: number;
  appointments_remaining: number;
  plan: BenefitPlan;
  plan_snapshot: BenefitPlan | null;
}
export interface BenefitVoucher {
  id: number;
  code: string;
  business_id: number;
  business_name: string;
  reward: string;
  status: "AVAILABLE" | "USED" | "EXPIRED";
  expires_at: string;
  used_at: string | null;
}
export interface BenefitsCatalog {
  history: {
    id: number;
    amount: number;
    unit: "STAMP" | "POINT";
    description: string;
    created_at: string;
  }[];
  promotions: BenefitPromotion[];
  programs: BenefitProgram[];
  plans: BenefitPlan[];
  memberships: BenefitMembership[];
  vouchers: BenefitVoucher[];
  summary: {
    points: number;
    cards: number;
    ready_rewards: number;
    active_memberships: number;
    available_vouchers: number;
  };
  rules: {
    stacking: boolean;
    loyalty_earning: string;
    voucher_validity_days: number;
  };
}
export interface BenefitResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
export interface BenefitsCatalogState {
  catalog: {
    data: BenefitsCatalog | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  filters: {
    search: string;
    setSearch: (value: string) => void;
    businessId: string;
    setBusinessId: (value: string) => void;
  };
}
export type BenefitAction =
  | { kind: "join"; program: BenefitProgram }
  | { kind: "redeem"; program: BenefitProgram }
  | { kind: "subscribe"; plan: BenefitPlan }
  | { kind: "cancel"; membership: BenefitMembership };
export interface BenefitActionsState {
  mutation: {
    selected: BenefitAction | null;
    pending: boolean;
    error: string | null;
    success: string | null;
  };
  actions: {
    select: (action: BenefitAction) => void;
    close: () => void;
    confirm: () => Promise<void>;
    clearSuccess: () => void;
  };
}
export type MembershipCheckout = CheckoutOrder;
export type WompiConfig = PaymentConfig;
export interface MembershipPaymentState {
  payment: {
    config: WompiConfig | null;
    order: MembershipCheckout | null;
    pending: boolean;
    error: string | null;
  };
  actions: {
    start: (planId: number) => Promise<void>;
    refresh: () => Promise<void>;
  };
}
