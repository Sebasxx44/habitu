import type { Editor } from "@tiptap/react";

// DOMAIN
export type CampaignStatus =
  | "DRAFT"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SENT"
  | "SENDING"
  | "SCHEDULED";
export type CampaignType = "PROMO" | "NEWS" | "REMINDER" | "CUSTOM";
export interface CampaignSegment {
  age_min?: number;
  age_max?: number;
  birthday_month?: number;
  is_vip?: boolean;
  tier?: string;
  min_visits?: number;
  max_visits?: number;
  inactive_days?: number;
  has_membership?: boolean;
  joined_after?: string;
  joined_before?: string;
}
export interface CampaignDraft {
  business_id: number;
  subject: string;
  body: string;
  type: CampaignType;
  target_role: "CLIENTE" | "PROFESSIONAL";
  target_ids: number[];
  segment: CampaignSegment;
  promotion_id: number | null;
}
export interface CampaignRecord extends Omit<
  CampaignDraft,
  "target_ids" | "segment"
> {
  id: number;
  target_ids: number[] | null;
  segment: CampaignSegment | null;
  status: CampaignStatus;
  recipients_count: number;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
}
export interface CampaignOptions {
  businesses: { id: number; name: string }[];
  promotions: {
    id: number;
    business_id: number;
    title: string;
    promo_code: string | null;
    discount: number | string;
    type: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
  }[];
  tiers: string[];
  integration: {
    mailer: string;
    configured: boolean;
    delivery_enabled: boolean;
    queue_connection: string;
    tracking_enabled: boolean;
  };
}
export interface CampaignAudience {
  total_recipients: number;
  recipients: { id: number; name: string; email: string }[];
  summary: { matching: number; excluded: number; preview_limit: number };
}
export interface CampaignAnalytics {
  total_recipients: number;
  sent_success: number;
  failed: number;
  opened: number;
  clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  pending: number;
  skipped: number;
  uncertain: number;
  tracking_available: boolean;
  logs_total: number;
  daily: {
    date: string;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
  }[];
  related_promotion: {
    id: number;
    title: string;
    promo_code: string | null;
    redemptions: number;
    savings: number;
    revenue: number;
    attribution: "promotion_total";
  } | null;
  logs: {
    id: number;
    recipient_email: string;
    recipient_name: string;
    status: string;
    created_at: string;
    error_message?: string | null;
  }[];
}
export interface CampaignFilters {
  q: string;
  status: string;
  type: string;
  business_id: string;
}

// COMPOSABLE CONTRACTS
export interface CampaignListingState {
  listing: {
    items: CampaignRecord[];
    options: CampaignOptions | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  filters: {
    values: CampaignFilters;
    update: (value: Partial<CampaignFilters>) => void;
  };
  metrics: {
    campaigns: number;
    drafts: number;
    sent: number;
    recipients: number;
  };
}
export interface CampaignAudienceState {
  data: CampaignAudience | null;
  loading: boolean;
  error: string | null;
}
export interface CampaignEditorState {
  editor: {
    form: CampaignDraft;
    options: CampaignOptions | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    editing: boolean;
    dirty: boolean;
  };
  actions: {
    update: (value: Partial<CampaignDraft>) => void;
    segment: (value: Partial<CampaignSegment>) => void;
    save: () => Promise<void>;
    retry: () => void;
  };
}
export interface CampaignDetailState {
  detail: {
    campaign: CampaignRecord | null;
    stats: CampaignAnalytics | null;
    options: CampaignOptions | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  operation: {
    busy: boolean;
    confirmation: "send" | "delete" | null;
    error: string | null;
    confirm: (value: "send" | "delete" | null) => void;
    execute: () => Promise<void>;
  };
}

export interface CampaignContentState {
  editor: Editor | null;
  media: { kind: "image" | "link" | null; url: string; error: string | null };
  actions: {
    choose: (kind: "image" | "link" | null) => void;
    setUrl: (url: string) => void;
    insert: () => void;
  };
}
