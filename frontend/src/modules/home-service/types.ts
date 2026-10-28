import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import type { HomeServiceMetrics } from "@/modules/home-service/analytics";
import type {
  OnDemandLocation,
  OnDemandRequest,
  OnDemandStatus,
} from "@/services/ondemand/ondemandService";

// TYPES
export interface OnDemandPresenceState {
  data: { paused: boolean; busy: boolean; error: boolean };
  actions: {
    toggle: () => Promise<void>;
    reject: (id: number) => Promise<void>;
  };
}

export interface HomeServicePoint {
  lat: number;
  lng: number;
  accuracy?: number;
}
export interface HomeServiceForm {
  category: string;
  description: string;
  address: string;
  instructions: string;
}
export type HomeServiceField = keyof HomeServiceForm | "location";
export type HomeServiceErrors = Partial<Record<HomeServiceField, string>>;
export interface HomeServiceStep {
  status: OnDemandStatus;
  label: string;
  description: string;
  date?: string | null;
}
export interface HomeServiceLocationState {
  point: HomeServicePoint | null;
  locating: boolean;
  error: string | null;
  locate: () => void;
  select: (point: HomeServicePoint) => void;
  manual: {
    latitude: string;
    longitude: string;
    setLatitude: (value: string) => void;
    setLongitude: (value: string) => void;
  };
}
export interface ProfessionalLocationState {
  enabled: boolean;
  sending: boolean;
  lastSentAt: Date | null;
  error: string | null;
  setEnabled: (enabled: boolean) => void;
}
export interface HomeServiceRequestsState {
  requests: OnDemandRequest[];
  selected: OnDemandRequest | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  updatedAt: Date | null;
  professionalLocation: OnDemandLocation | null;
  select: (request: OnDemandRequest | null) => void;
  refresh: () => Promise<void>;
  replace: (request: OnDemandRequest) => void;
}
export interface HomeServiceFormState {
  values: HomeServiceForm;
  errors: HomeServiceErrors;
  submitting: boolean;
  progress: number;
  setField: (field: keyof HomeServiceForm, value: string) => void;
  submit: () => Promise<void>;
  reset: (address?: string) => void;
}
export interface HomeServiceCancellationState {
  reason: string;
  busy: boolean;
  setReason: (value: string) => void;
  cancel: () => Promise<void>;
}
export interface OnDemandOperationsState {
  data: {
    requests: OnDemandRequest[];
    filtered: OnDemandRequest[];
    selected: OnDemandRequest | null;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    updatedAt: Date | null;
  };
  filters: {
    status: OnDemandStatus | "ALL";
    query: string;
    setStatus: (status: OnDemandStatus | "ALL") => void;
    setQuery: (query: string) => void;
  };
  actions: {
    refresh: () => Promise<void>;
    select: (request: OnDemandRequest | null) => void;
    advance: (request: OnDemandRequest) => Promise<void>;
    busyId: number | null;
  };
  completion: {
    finalPrices: Record<number, string>;
    setFinalPrice: (id: number, value: string) => void;
  };
}

export interface OnDemandAnalyticsData extends HomeServiceMetrics {
  period: { start: string; end: string; days: number };
}
export interface OnDemandAnalyticsState {
  overview: { data: OnDemandAnalyticsData | null; loading: boolean; error: string | null; refresh: () => void };
  filters: { range: DateRangeValue; setRange: (range: DateRangeValue) => void };
}
