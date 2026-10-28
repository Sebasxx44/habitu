import type { Dispatch, SetStateAction } from "react";

// TYPES
export type RecipeKind =
  "RETURN_REMINDER" | "MEMBERSHIP_EXPIRING" | "OPEN_SLOTS_PROMOTION";
export interface Recipe {
  kind: RecipeKind;
  enabled: boolean;
  inactive_days: number;
  lead_days: number;
  frequency_days: number;
  minimum_discount: number;
  maximum_discount: number;
}
export interface RetentionAction {
  id: number;
  kind: RecipeKind;
  state:
    "PROPOSED" | "EXPIRED" | "SUPPRESSED" | "NOTIFIED_IN_APP" | "PUBLISHED";
  payload: {
    title: string;
    message?: string;
    date?: string;
    free_start_options?: number;
    suggested_discount?: number;
  };
  expires_at: string;
  promotion_id: number | null;
  read_in_app: boolean;
  clicked: boolean;
  completed_bookings: number;
}
export interface RetentionOverview {
  recipes: Recipe[];
  actions: RetentionAction[];
  clinical_marketing_excluded: boolean;
  channel: "IN_APP";
  waitlist_connected: boolean;
}
export interface RecipeState {
  directory: {
    data: RetentionOverview | null;
    busy: boolean;
    error: boolean;
    refresh: () => void;
    scan: () => Promise<void>;
  };
  editor: {
    value: Recipe;
    setValue: Dispatch<SetStateAction<Recipe>>;
    select: (kind: RecipeKind) => void;
    save: () => Promise<void>;
  };
  actions: { approve: (action: RetentionAction) => Promise<void> };
}
export interface ReferralProgramForm {
  enabled: boolean;
  reward: number;
  minimum_paid: number;
  currency: string;
  validity_days: number;
  qualification_days: number;
  terms: string;
}
export interface ReferralProgramRecord extends Omit<
  ReferralProgramForm,
  "reward" | "minimum_paid"
> {
  reward_minor: number;
  minimum_paid_minor: number;
}
export interface ReferralProgramState {
  form: {
    value: ReferralProgramForm;
    setValue: Dispatch<SetStateAction<ReferralProgramForm>>;
    save: () => Promise<void>;
  };
  request: { loading: boolean; busy: boolean; error: boolean; saved: boolean };
}
