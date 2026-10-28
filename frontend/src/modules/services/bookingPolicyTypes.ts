import type { Resource, Service } from "@/types/models";

// TYPES
export type BookingModel = NonNullable<Service["booking_model"]>;
export interface BookingPolicy {
  booking_model: BookingModel;
  duration_mode: "fixed" | "selectable";
  duration_options: number[];
  booking_capacity: number;
  min_advance_minutes: number;
  max_advance_days: number | null;
  slot_interval_minutes: number;
  buffer_minutes: number;
  requires_confirmation: boolean;
  allow_cancellation: boolean;
  allow_reschedule: boolean;
  cancellation_notice_minutes: number;
  reschedule_notice_minutes: number;
  resource_professional_optional: boolean;
  resource_ids: number[];
}
export interface BookingPolicyState {
  form: { value: BookingPolicy; durations: string };
  actions: {
    field: <K extends keyof BookingPolicy>(
      key: K,
      value: BookingPolicy[K],
    ) => void;
    durations: (value: string) => void;
    reset: (service?: Service, defaultModel?: BookingModel) => void;
    payload: (baseDuration: number) => BookingPolicy;
  };
}
export interface BookingPolicyFieldsProps {
  policy: BookingPolicyState;
  resources: Resource[];
  disabled: boolean;
}
export interface ServiceStats {
  currency: string;
  stats: {
    totalAppointments: number;
    totalRevenue: number;
    monthAppointments: number;
    monthRevenue: number;
    avgPrice: number;
    completionRate: number;
  };
  weeklyTrend: { label: string; citas: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
  topBarbers: {
    barber_id: number;
    name: string;
    photo_url: string | null;
    specialty: string | null;
    total_citas: number;
    total_revenue: number;
  }[];
  topClients: {
    id: number;
    name: string;
    email: string | null;
    total_visits: number;
    total_spent: number;
    last_visit: string;
  }[];
}
