import type { ChartDatum, ChartSeries } from "@/modules/charting/types";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
// TYPES
export type AnalyticsPreset = "7" | "30" | "90" | "365" | "custom";
export type AnalyticsGrain = "day" | "week" | "month" | "quarter" | "year";
export interface AnalyticsFilters {
  preset: AnalyticsPreset;
  start: string;
  end: string;
  currency: string;
  grain: AnalyticsGrain;
}
export interface AnalyticsMetric {
  id: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  unit: "count" | "currency" | "percent" | "minutes" | "rating";
}
export interface AnalyticsPeriod {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
  days: number;
  grain: AnalyticsGrain;
}
export interface AnalyticsSeries {
  date: string;
  reservations: number;
  completed: number;
  cancelled: number;
  revenue: number;
  previousReservations: number;
  previousRevenue: number;
}
export interface PerformanceRow {
  id: number;
  name: string;
  reservations: number;
  completed: number;
  cancelled: number;
  revenue: number;
  clients?: number;
  averagePrice?: number | null;
  previous?: number;
  change?: number | null;
  occupancy?: number | null;
  rating?: number | null;
  ratingCount?: number;
  hours?: AnalyticsBucket[];
  services?: { id: number; name: string; reservations: number }[];
}
export interface AnalyticsBucket {
  id: string;
  value: number;
}
export interface AnalyticsTelemetry {
  available: boolean;
  minimumGroup: number;
  assistantAvailable: boolean;
  since: string | null;
  retentionDays: number;
  funnel: { id: string; sessions: number | null; rate: number | null }[];
  assistant: { id: string; value: number | null }[];
  conversion: number | null;
  serviceConversion: {
    id: number;
    views: number;
    bookings: number;
    rate: number;
  }[];
  searchedServices: { id: number; name: string; value: number }[];
  zeroResults: number | null;
  zeroResultCategories: { id: number; name: string; value: number }[];
  viewedServices: { id: number; name: string; value: number }[];
}
export interface GeographyRow {
  id: number;
  name: string;
  reservations: number;
  clients: number;
  businesses: number;
  countryId?: number;
}
export interface PlatformAnalytics {
  metrics: AnalyticsMetric[];
  growth: {
    date: string;
    users: number;
    previousUsers: number;
    businesses: number;
    previousBusinesses: number;
  }[];
  geography: {
    minimumGroup: number;
    countries: GeographyRow[];
    cities: GeographyRow[];
    precision: string;
  };
  categories: {
    id: number;
    name: string;
    reservations: number;
    previous: number;
    change: number | null;
  }[];
  demographics: { available: boolean; reason: string };
}
export interface AnalyticsOverview {
  scope: {
    type: "business" | "platform";
    id: number | null;
    name: string;
    professionals: boolean;
    resources: boolean;
  };
  generatedAt: string;
  timezone: string;
  currency: string;
  currencies: string[];
  period: AnalyticsPeriod;
  metrics: AnalyticsMetric[];
  series: AnalyticsSeries[];
  statuses: AnalyticsBucket[];
  hours: AnalyticsBucket[];
  weekdays: AnalyticsBucket[];
  services: PerformanceRow[];
  professionals: PerformanceRow[];
  resources: PerformanceRow[];
  branches: PerformanceRow[];
  promotions: {
    id: number;
    name: string;
    reservations: number;
    discount: number;
  }[];
  ratingCount: number;
  limitations: string[];
  telemetry: AnalyticsTelemetry;
  platform: PlatformAnalytics | null;
}
export interface AnalyticsState {
  overview: {
    data: AnalyticsOverview | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  filters: {
    value: AnalyticsFilters;
    setRange: (range: DateRangeValue) => void;
    update: <K extends keyof AnalyticsFilters>(
      key: K,
      value: AnalyticsFilters[K],
    ) => void;
  };
}

export interface AnalyticsBusinessSelection {
  businesses: {
    items: { id: number; name: string }[];
    loading: boolean;
    failed: boolean;
  };
  selection: { id: number | null; select: (id: number) => void };
}

export type PerformanceMeasure = "reservations" | "completed" | "cancelled" | "revenue";
export interface PerformanceChartState {
  selection: { measure: PerformanceMeasure; setMeasure: (measure: PerformanceMeasure) => void };
  chart: { data: ChartDatum[]; series: ChartSeries[] };
}
