import type { FormEvent } from "react";
import type { AnalyticsFilters } from "@/modules/analytics/types";

// TYPES
export interface HealthSegments {
  city: string;
  category: string;
  hour: string;
}
export interface HealthMetric {
  id: string;
  numerator: number | null;
  denominator: number;
  value: number | null;
  unit: "percent" | "currency";
  source: string;
}
export interface HealthOverview {
  period: { start: string; end: string };
  currency: string;
  timezone: string;
  generated_at: string;
  sample: number | null;
  excluded: number | null;
  minimum_group: number;
  suppressed: boolean;
  metrics: HealthMetric[];
  modalities: { modality: string; numerator: number; denominator: number }[];
  cancellations: { responsible: string; count: number }[];
  cohorts: {
    month: string;
    sample: number | null;
    eligible: number | null;
    returned: number | null;
    rate: number | null;
  }[];
  finance: {
    approval: { numerator: number; denominator: number; rate: number | null };
    collected: number;
    aged_pending: number;
    unreconciled: number;
    refund_pending: number;
    refunded: number;
    refund_failed: number;
    payout_pending: number;
    payout_failed: number;
    source: string;
  } | null;
  quality: {
    affected: number;
    denominator: number;
    rate: number | null;
    resolved: number;
    mean_resolution_hours: number | null;
    source: string;
  } | null;
  limitations: string[];
  segments: {
    cities: { id: number; name: string }[];
    categories: { id: number; name: string }[];
  };
}
export interface HealthResult {
  data: HealthOverview | null;
  request: { loading: boolean; error: boolean; reload: () => void };
  segments: {
    value: HealthSegments;
    update: (key: keyof HealthSegments, value: string) => void;
  };
}
export type AnalyticsEnvironment =
  "UNCLASSIFIED" | "PRODUCTION" | "DEMO" | "TEST";
export interface HealthBusiness {
  id: number;
  name: string;
  analytics_environment: AnalyticsEnvironment;
}
export interface ClassificationResult {
  list: {
    businesses: HealthBusiness[];
    search: string;
    setSearch: (value: string) => void;
    page: number;
    lastPage: number;
    setPage: (page: number) => void;
  };
  form: {
    id: number;
    environment: AnalyticsEnvironment;
    reason: string;
    select: (id: number) => void;
    setEnvironment: (value: AnalyticsEnvironment) => void;
    setReason: (value: string) => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  request: { loading: boolean; busy: boolean; error: boolean; saved: boolean };
}
export interface HealthPanelProps {
  businessId: number | null;
  filters: AnalyticsFilters;
}

export type HealthFeatureName = "group_coordination" | "routines";
export type HealthFeatureScope = "global" | "business" | "category";
export type HealthFeatureState = "inherit" | "enabled" | "disabled";
export interface HealthFeature {
  name: HealthFeatureName;
  enabled: boolean;
  user_percentage: number;
  override: boolean | null;
}
export interface HealthFeaturesResponse {
  flags: HealthFeature[];
  categories: { id: number; name: string }[];
}
export interface HealthFeatureChange {
  scope: HealthFeatureScope;
  scope_id: number | null;
  enabled: boolean | null;
  user_percentage: number;
  reason: string;
}
export interface HealthFeaturesResult {
  selection: {
    flags: HealthFeature[];
    categories: { id: number; name: string }[];
    flag: HealthFeatureName;
    scope: HealthFeatureScope;
    categoryId: number;
    setFlag: (value: HealthFeatureName) => void;
    setScope: (value: HealthFeatureScope) => void;
    setCategoryId: (value: number) => void;
  };
  form: {
    state: HealthFeatureState;
    percentage: number;
    reason: string;
    selected: HealthFeature | undefined;
    available: boolean;
    setState: (value: HealthFeatureState) => void;
    setPercentage: (value: number) => void;
    setReason: (value: string) => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  request: { loading: boolean; busy: boolean; error: boolean; saved: boolean };
}

export interface OperationalDiagnosticsData {
  observed_at: string;
  signals: {
    name: "scheduler" | "outbox" | "payments" | "checkout_expiry" | "queue";
    status: "NO_EVIDENCE" | "OBSERVED" | "RUNNING" | "SUCCEEDED" | "FAILED";
    last_seen_at: string | null;
    last_succeeded_at: string | null;
    last_failed_at: string | null;
    stale: boolean | null;
  }[];
  queue: {
    driver: string;
    pending: number | null;
    reserved: number | null;
    failed: number | null;
  };
  outbox: {
    pending: number;
    processing: number;
    failed: number;
    delivered: number;
    oldest_pending_at: string | null;
  };
  providers: {
    name: "email" | "payments" | "calendar" | "push" | "webhooks";
    configured: boolean;
    enabled: boolean | null;
    mode: string;
  }[];
}
export interface OperationalDiagnosticsResult {
  data: OperationalDiagnosticsData | null;
  request: { loading: boolean; error: boolean; reload: () => void };
}
