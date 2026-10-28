export interface ReferralSummary {
  code: string;
  attributed: number;
  qualified: number;
  applied: boolean;
  rewards: {
    id: number;
    status: string;
    currency: string;
    amount_minor: number;
    promo_code: string;
    end_date: string;
    business_id: number;
  }[];
  programs: {
    business_id: number;
    reward_minor: number;
    currency: string;
    minimum_paid_minor: number;
    validity_days: number;
    qualification_days: number;
    terms: string;
  }[];
}
export interface ContactPreferences {
  promotions_enabled: boolean;
  timezone: string;
  contact_start: string;
  contact_end: string;
}
export interface ReferralState {
  data: ReferralSummary | null;
  loading: boolean;
  busy: boolean;
  error: boolean;
  invitation: {
    code: string;
    setCode: (value: string) => void;
    copied: boolean;
    copy: () => Promise<void>;
    apply: () => Promise<void>;
  };
  preferences: {
    value: ContactPreferences;
    setValue: (value: ContactPreferences) => void;
    save: () => Promise<void>;
  };
}
