import type { BusinessSelectionState } from "@/composables/business/types";

// TYPES
export interface MembershipPlan {
  id: number;
  business_id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  currency: string;
  billing_cycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  appointments_included: number;
  discount_percentage: string | number;
  benefits?: string[] | null;
  is_active: boolean;
}
export interface ClientMembership {
  id: number;
  membership_plan_id: number;
  status: string;
  starts_at: string;
  ends_at: string;
  appointments_remaining: number;
  appointments_used: number;
  plan: MembershipPlan;
}
export interface MembershipResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
export interface MembershipState {
  selection: BusinessSelectionState;
  list: {
    plans: MembershipPlan[];
    memberships: ClientMembership[];
    loading: boolean;
    error: string | null;
    success: string | null;
    refresh: () => void;
  };
  actions: {
    pending: boolean;
    canSubscribe: boolean;
    subscribe: (plan: MembershipPlan) => Promise<void>;
    cancel: (id: number) => Promise<void>;
    isActive: (membership: ClientMembership) => boolean;
  };
}
