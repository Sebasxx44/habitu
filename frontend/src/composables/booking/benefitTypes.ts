import type {
  BenefitMembership,
  BenefitPlan,
  BenefitProgram,
  BenefitPromotion,
} from "@/modules/benefits/types";

// TYPES
export interface BookingBenefitContext {
  businessId: number;
  serviceId: number | null;
  professionalId: number | null;
  date: string;
  time: string;
  subtotal: number | null;
}

export interface BookingBenefitSelection {
  promotions: BenefitPromotion[];
  programs: BenefitProgram[];
  memberships: BenefitMembership[];
  plans: BenefitPlan[];
}

export interface BookingBenefitsState {
  catalog: BookingBenefitSelection & {
    loading: boolean;
    error: string | null;
  };
  enrollment: {
    pendingId: number | null;
    error: string | null;
  };
  actions: {
    reload: () => void;
    join: (programId: number) => Promise<void>;
  };
}
