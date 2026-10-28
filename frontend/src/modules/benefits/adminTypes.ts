import type { BenefitReference } from "@/modules/benefits/types";

// DOMAIN
export type BenefitAdminKind = "programs" | "plans" | "promotions";
export interface AdminBenefitRecord {
  id: number;
  business_id: number;
  name?: string;
  title?: string;
  description: string | null;
  active?: boolean;
  is_active?: boolean;
  stamps_required?: number;
  reward_description?: string;
  valid_until?: string | null;
  service_id?: number | null;
  professional_id?: number | null;
  cards_count?: number;
  price?: number | string;
  currency?: string;
  billing_cycle?: "MONTHLY" | "QUARTERLY" | "YEARLY";
  appointments_included?: number;
  included_services?: number[] | null;
  discount_percentage?: number | string;
  benefits?: string[] | null;
  subscribers_count?: number;
  active_subscribers_count?: number;
  redemptions_count?: number;
  saved_amount?: number;
  discount?: number | string;
  type?: string;
  promo_code?: string | null;
  start_date?: string;
  end_date?: string;
  min_purchase?: string | number | null;
  max_discount?: string | number | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  usage_count?: number;
  services?: {
    id: number;
    name: string;
    pivot: { discount: number | string; type: string };
  }[];
}
export interface AdminVoucher {
  id: number;
  code: string;
  reward: string;
  status: string;
  expires_at: string;
  used_at: string | null;
  client_name: string;
}
export interface AdminLoyaltyCard {
  id: number;
  current_stamps: number;
  status: string;
  reward_available: boolean;
  client: BenefitReference;
  program: BenefitReference & {
    stamps_required: number;
    reward_description: string;
  };
}
export interface AdminCardDetail {
  card: AdminLoyaltyCard;
  history: {
    id: number;
    points: number;
    description: string;
    created_at: string;
  }[];
}
export interface AdminBenefitsData {
  analytics?: AdminBenefitsAnalytics;
  memberships?: AdminMembership[];
  transactions?: AdminBenefitTransaction[];
  cards: {
    data: AdminLoyaltyCard[];
    total: number;
    current_page: number;
    last_page: number;
  };
  businesses: BenefitReference[];
  business_id: number;
  services: BenefitReference[];
  professionals?: BenefitReference[];
  programs: AdminBenefitRecord[];
  plans: AdminBenefitRecord[];
  promotions: AdminBenefitRecord[];
  vouchers: AdminVoucher[];
}
export interface AdminBenefitsState {
  listing: {
    data: AdminBenefitsData | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  selection: {
    cardsPage: number;
    setCardsPage: (value: number) => void;
    businessId: string;
    setBusinessId: (value: string) => void;
  };
}
export interface BenefitForm {
  name: string;
  description: string;
  active: boolean;
  stamps: string;
  reward: string;
  validUntil: string;
  serviceId: string;
  professionalId: number | null;
  price: string;
  cycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  appointments: string;
  discountPercentage: string;
  benefits: string;
  serviceIds: number[];
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discount: string;
  startsAt: string;
  endsAt: string;
  minimum: string;
  maximum: string;
  usageLimit: string;
  perUserLimit: string;
  serviceDiscounts: { id: number; type: "PERCENTAGE" | "FIXED_AMOUNT"; discount: string }[];
}
export interface BenefitWrite {
  business_id: number;
  name?: string;
  description: string;
  active?: boolean;
  stamps_required?: number;
  reward_description?: string;
  valid_until?: string | null;
  service_id?: number | null;
  professional_id?: number | null;
  price?: number;
  currency?: string;
  billing_cycle?: string;
  appointments_included?: number;
  discount_percentage?: number;
  included_services?: number[];
  benefits?: string[];
  is_active?: boolean;
  title?: string;
  promo_code?: string;
  type?: string;
  discount?: number;
  start_date?: string;
  end_date?: string;
  min_purchase?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  services?: { id: number; type: string; discount: number }[];
}
export interface BenefitEditorState {
  editor: {
    kind: BenefitAdminKind;
    form: BenefitForm;
    busy: boolean;
    error: string | null;
  };
  actions: {
    setForm: (update: Partial<BenefitForm>) => void;
    save: () => Promise<void>;
  };
}
export interface VoucherDeliveryState {
  delivery: {
    code: string;
    confirming: boolean;
    busy: boolean;
    error: string | null;
    success: boolean;
  };
  actions: {
    setCode: (value: string) => void;
    select: (code: string) => void;
    close: () => void;
    confirm: () => Promise<void>;
  };
}

// ADMINISTRATION
export interface AdminBenefitsAnalytics {
  promotions: { redemptions: number; saved_amount: number; unique_clients: number; active: number };
  memberships: { active: number; subscribers: number; verified_revenue: number; used_appointments: number };
  loyalty: { cards: number; stamps: number; rewards_delivered: number; available_vouchers: number };
}
export interface AdminMembership {
  id: number;
  status: string;
  starts_at: string;
  ends_at: string;
  appointments_used: number;
  appointments_remaining: number;
  amount_paid: number;
  payment_reference: string | null;
  client: BenefitReference;
  plan: BenefitReference;
}
export interface AdminBenefitTransaction {
  id: string;
  kind: "promotion" | "membership" | "loyalty";
  description: string;
  client_name: string;
  amount: number;
  unit: "COP" | "STAMP";
  status: string;
  created_at: string;
  reference: string | null;
}
export type AdminBenefitStatus = "active" | "paused" | "scheduled" | "expired" | "exhausted";
export interface AdminBenefitsDirectoryState {
  filters: {
    search: string;
    setSearch: (value: string) => void;
    status: string;
    setStatus: (value: string) => void;
    serviceId: string;
    setServiceId: (value: string) => void;
    reset: () => void;
  };
  records: { items: AdminBenefitRecord[]; total: number };
  removal: {
    selected: AdminBenefitRecord | null;
    busy: boolean;
    error: string | null;
    success: string | null;
    select: (record: AdminBenefitRecord | null) => void;
    confirm: () => Promise<void>;
  };
}
export interface AdminLoyaltyCardState {
  card: { data: AdminCardDetail | null; loading: boolean; error: string | null; refresh: () => void };
  stamp: { confirming: boolean; busy: boolean; error: string | null; success: string | null; select: () => void; cancel: () => void; confirm: () => Promise<void> };
}
