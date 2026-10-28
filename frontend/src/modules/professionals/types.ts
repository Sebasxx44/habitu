import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import type { Professional, ProfessionalAvailability } from "@/types/models";

// TYPES
export interface ProfessionalServiceItem {
  id: number;
  name: string;
  price: number | string;
  currency?: string;
  duration_minutes: number;
  is_active: boolean;
}
export interface ProfessionalPortfolio {
  id: number;
  image_url: string;
  title?: string;
  description?: string;
}
export interface ProfessionalRecord extends Professional {
  availability: ProfessionalAvailability[];
  services: ProfessionalServiceItem[];
  portfolios: ProfessionalPortfolio[];
}
export interface ProfessionalResponse {
  data: Omit<ProfessionalRecord, "commission_percentage"> & {
    commission_percentage?: number | string;
  };
}
export interface ProfessionalAppointment {
  id: number;
  date: string;
  start_time?: string;
  time?: string;
  status: string;
  currency?: string;
  final_price?: number | string | null;
  price?: number | string | null;
  client?: { id: number; name: string };
  service?: { id: number; name: string };
}
export interface ProfessionalDashboard {
  currency: string;
  currencies: string[];
  stats: {
    monthRevenue: number;
    monthAppointments: number;
    dayRevenue: number;
    todayAppointments: number;
    weekAppointments: number;
  };
  dailyIncome: { label: string; income: number | string }[];
  serviceBreakdown: { name: string; value: number | string }[];
  statusBreakdown: { name: string; value: number | string }[];
  recentAppointments: ProfessionalAppointment[];
}
export interface ProfessionalForm {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  bio: string;
  photo_url: string;
  commission_percentage: string;
  is_active: boolean;
}
export interface ProfessionalsDirectoryReturn {
  data: {
    items: ProfessionalRecord[];
    filtered: ProfessionalRecord[];
    specialties: string[];
    active: number;
    scheduled: number;
    averageCommission: number;
  };
  filters: {
    search: string;
    status: string;
    specialty: string;
    sort: string;
    update: (key: string, value: string) => void;
    clear: () => void;
    hasFilters: boolean;
  };
  request: { loading: boolean; error: string; reload: () => Promise<void> };
  actions: { exportCsv: () => void };
}
export interface ProfessionalProfileReturn {
  profile: {
    value: ProfessionalRecord | null;
    loading: boolean;
    error: string;
    reload: () => Promise<void>;
  };
  analysis: {
    value: ProfessionalDashboard | null;
    loading: boolean;
    error: string;
    currency: string;
    setCurrency: (value: string) => void;
    range: DateRangeValue;
    setRange: (value: DateRangeValue) => void;
    reload: () => Promise<void>;
    invalidRange: boolean;
  };
}
export interface ProfessionalFormReturn {
  form: {
    value: ProfessionalForm;
    setField: <K extends keyof ProfessionalForm>(
      key: K,
      value: ProfessionalForm[K],
    ) => void;
    uploadPhoto: (file?: File) => void;
  };
  request: {
    loading: boolean;
    saving: boolean;
    error: string;
    photoError: string;
    save: () => Promise<void>;
  };
}

export interface ProfessionalRemovalReturn {
  confirmation: { name: string; setName: (value: string) => void };
  request: { saving: boolean; error: string };
  actions: { remove: () => Promise<void>; deactivate: () => Promise<void> };
}
