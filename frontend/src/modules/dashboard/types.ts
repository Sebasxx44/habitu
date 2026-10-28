import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import type { ChartDatum, ChartSeries } from "@/modules/charting/types";
import type { User } from "@/types/auth";

// TYPES
export type DashboardPeriod = 7 | 30 | 90 | 365;
export type DashboardRole = User["role"];
export type MetricUnit = "count" | "currency" | "percent";

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  unit: MetricUnit;
  previous: number | null;
  change: number | null;
  description: string;
}

export interface DashboardAppointment {
  id: number;
  bookingCode: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  client: string;
  professional: string | null;
  service: string;
  business: string;
  price: number;
  currency: string;
}

export interface DashboardOverview {
  role: DashboardRole;
  scopeName: string;
  generatedAt: string;
  timezone: string;
  currency: string;
  currencies: string[];
  period: {
    days: number;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  metrics: DashboardMetric[];
  series: {
    date: string;
    appointments: number;
    completed: number;
    cancelled: number;
    revenue: number;
  }[];
  statuses: { status: string; count: number }[];
  services: {
    id: number;
    name: string;
    appointments: number;
    revenue: number;
  }[];
  upcoming: DashboardAppointment[];
  loyalty: {
    points: number;
    rewards: number;
    cards: {
      id: number;
      business: string;
      name: string;
      stamps: number;
      required: number;
      reward: string;
      available: boolean;
    }[];
  };
  notices: {
    id: number;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }[];
}

export interface DashboardState {
  overview: {
    data: DashboardOverview | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  filters: {
    range: DateRangeValue;
    setRange: (range: DateRangeValue) => void;
    currency: string;
    setCurrency: (currency: string) => void;
    currencies: string[];
  };
}

export interface DashboardChartState {
  selection: {
    measure: "appointments" | "revenue";
    setMeasure: (measure: "appointments" | "revenue") => void;
    isClient: boolean;
  };
  chart: { points: ChartDatum[]; series: ChartSeries[]; total: number };
}
