import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import type { Branch } from "@/types/models";

// TYPES
export interface BranchScheduleInput {
  day: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}
export interface BranchMetrics {
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  clients: number;
  revenue: number;
  averageTicket: number | null;
  upcoming: number;
}
export interface ManagedBranch extends Branch {
  schedules: {
    day: string;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }[];
  services_count: number;
  metrics: BranchMetrics;
}
export interface BranchSummary {
  branches: number;
  active: number;
  appointments: number;
  revenue: number;
  upcoming: number;
  currency: string;
  start: string;
  end: string;
}
export type BranchAnalytics = Pick<ManagedBranch, "id" | "name" | "metrics">;
export interface BranchPage {
  analytics: BranchAnalytics[];
  data: ManagedBranch[];
  total: number;
  last_page: number;
  current_page: number;
  summary: BranchSummary;
}
export interface BranchForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  lat: string;
  lng: string;
  is_main_branch: boolean;
  is_active: boolean;
  schedules: BranchScheduleInput[];
}
export interface BranchPayload extends Omit<BranchForm, "lat" | "lng"> {
  lat: number | null;
  lng: number | null;
  business_id?: number;
}
export interface BranchDirectoryState {
  directory: {
    items: ManagedBranch[];
    analytics: BranchAnalytics[];
    summary: BranchSummary | null;
    loading: boolean;
    error: string | null;
    total: number;
    lastPage: number;
    refresh: () => void;
  };
  filters: {
    search: string;
    setSearch: (value: string) => void;
    active: string;
    setActive: (value: string) => void;
    range: DateRangeValue;
    setRange: (value: DateRangeValue) => void;
    currency: string;
    setCurrency: (value: string) => void;
    page: number;
    setPage: (value: number) => void;
  };
}
export interface BranchEditorState {
  editor: {
    open: boolean;
    branch: ManagedBranch | null;
    form: BranchForm;
    saving: boolean;
    error: string | null;
    update: <K extends keyof BranchForm>(key: K, value: BranchForm[K]) => void;
    schedule: (day: number, values: Partial<BranchScheduleInput>) => void;
    create: () => void;
    edit: (branch: ManagedBranch) => void;
    close: () => void;
    save: () => Promise<void>;
  };
  removal: {
    branch: ManagedBranch | null;
    busy: boolean;
    error: string | null;
    select: (branch: ManagedBranch | null) => void;
    confirm: () => Promise<void>;
  };
}
