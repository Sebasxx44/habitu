import type { BookingAppointment } from "@/composables/booking/types";

// TYPES
export type AppointmentView = "upcoming" | "completed" | "cancelled";
export interface ClientAppointment extends BookingAppointment {
  status:
    "PENDIENTE" | "CONFIRMADA" | "COMPLETADA" | "CANCELADA" | "NO_ASISTIO";
  time: string;
  price: number;
  review_id?: number | null;
  payment_status?: string;
  payment_method?: string;
  base_price?: number;
  allowed_actions?: AppointmentActions;
}
export interface AppointmentPage {
  data: ClientAppointment[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
export interface AppointmentPageQuery {
  view?: AppointmentView;
  page: number;
  per_page: number;
  date_from?: string;
  date_to?: string;
  professional_id?: number;
  branch_id?: number;
  search?: string;
  status?: string;
}
export interface ReviewRequest {
  appointment_id: number;
  rating: number;
  service_rating?: number;
  professional_rating?: number;
  business_rating?: number;
  comment: string;
}
export interface RawClientAppointment extends Omit<
  ClientAppointment,
  "status" | "price"
> {
  status: string;
  price: number | string;
  final_price?: number | string;
}
export interface ClientAppointmentsState {
  list: {
    data: ClientAppointment[];
    loading: boolean;
    error: string | null;
    total: number;
    lastPage: number;
    refresh: () => void;
  };
  filters: {
    view: AppointmentView;
    setView: (view: AppointmentView) => void;
    page: number;
    setPage: (page: number) => void;
  };
  selection: {
    review: ClientAppointment | null;
    cancel: ClientAppointment | null;
    reschedule: ClientAppointment | null;
    selectReview: (appointment: ClientAppointment | null) => void;
    selectCancel: (appointment: ClientAppointment | null) => void;
    selectReschedule: (appointment: ClientAppointment | null) => void;
  };
  actions: {
    submitReview: (request: ReviewRequest) => Promise<void>;
    cancel: (reason: string) => Promise<BookingAppointment>;
    reschedule: (date: string, time: string) => Promise<BookingAppointment>;
  };
}

// DETAIL
export interface AppointmentActions { cancel: boolean; reschedule: boolean; review: boolean; rebook: boolean }
export interface AppointmentTimelineEvent { id: string; type: string; title: string; description: string | null; created_at: string }
export interface AppointmentPayment { id: number; amount: number; currency: string; method: string; status: string; paid_at: string | null }
export interface AppointmentDetail extends ClientAppointment { participants?: number; timeline: AppointmentTimelineEvent[]; payments: AppointmentPayment[]; duration_minutes?: number; created_at?: string; notes?: string }
export type AppointmentModal = 'cancel' | 'reschedule' | 'review' | null;
export interface AppointmentDetailState {
  detail: { data: AppointmentDetail | null; loading: boolean; error: string | null };
  selection: { modal: AppointmentModal; choose: (modal: AppointmentModal) => void };
  actions: { reload: () => void; cancel: (reason: string) => Promise<ClientAppointment>; reschedule: (date: string, time: string) => Promise<ClientAppointment>; review: (request: ReviewRequest) => Promise<void> };
}
