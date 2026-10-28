import type { RefObject } from "react";
import type { MarketingAd } from "@/modules/marketing/types";

// TYPES
export interface AdRecord {
  id: number;
  business_id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  placement: string;
  start_date: string;
  end_date: string;
  budget: string | null;
  spent: string;
  status: string;
  moderation_status: string;
  moderation_reason: string | null;
  impressions_count: number;
  clicks_count: number;
  completed_attributed_bookings: number;
  impression_limit: number | null;
  click_limit: number | null;
}
export interface AdsDirectory {
  ads: AdRecord[];
  businesses: { id: number; name: string; slug: string }[];
  can_moderate: boolean;
  billing_enabled: boolean;
  currency: string;
  attribution_window_days: number;
}
export interface AdForm {
  business_id: string;
  title: string;
  description: string;
  image_url: string;
  placement: string;
  start_date: string;
  end_date: string;
  budget: string;
  impression_limit: string;
  click_limit: string;
}
export interface AdsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface AdsError {
  message?: string;
  errors?: Record<string, string[]>;
}
export interface AdsDirectoryState {
  listing: {
    data: AdsDirectory | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  mutation: { busyId: number | null; error: string | null };
  actions: {
    status: (ad: AdRecord) => Promise<void>;
    remove: (id: number) => Promise<void>;
    moderate: (
      id: number,
      decision: "APPROVED" | "REJECTED",
      reason: string,
    ) => Promise<void>;
  };
}
export interface AdEditorState {
  editor: {
    id: number | null;
    form: AdForm;
    busy: boolean;
    error: string | null;
  };
  actions: {
    edit: (ad: AdRecord) => void;
    reset: () => void;
    setField: (field: keyof AdForm, value: string) => void;
    save: () => Promise<void>;
  };
}
export interface AdDeliveryState {
  display: {
    ads: MarketingAd[];
    index: number;
    loading: boolean;
    container: RefObject<HTMLDivElement>;
  };
  actions: {
    select: (index: number) => void;
    open: (ad: MarketingAd) => Promise<void>;
  };
}
