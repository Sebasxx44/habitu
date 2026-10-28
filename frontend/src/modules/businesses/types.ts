import type {
  Appointment,
  Business,
  Client,
  Professional,
  Resource,
  Review,
  Service,
} from "@/types/models";
import type { BookingBusiness } from "@/composables/booking/types";

// TYPES
export interface BusinessHours {
  active: boolean;
  start: string;
  end: string;
}
export interface ManagedBusiness extends Business {
  photo_url?: string;
  whatsapp?: string;
  instagram?: string;
  active?: boolean;
  opening_hours?: string | Record<string, BusinessHours>;
  hours?: {
    day: string;
    closed: boolean;
    open_time: string;
    close_time: string;
  }[];
}
export interface ReviewedBusiness extends BookingBusiness {
  photo_url?: string;
  city?: { name: string };
  gallery?: string[];
  reviews?: (Review & { client_name?: string })[];
  resources?: Resource[];
  professionals?: Professional[];
  services?: Service[];
}
export interface BusinessDaySchedule {
  open: string;
  close: string;
  closed: boolean;
}
export interface BusinessCreateForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  category_id: number | null;
  primary_color: string;
  logo_url: string;
  uses_professionals: boolean;
  uses_resources: boolean;
  services: { name: string; price: string; duration: string }[];
  professionals: { name: string; specialty: string }[];
  resources: { name: string; description: string; type: string }[];
  schedule: Record<string, BusinessDaySchedule>;
}
export interface BusinessCreatePayload extends Omit<
  BusinessCreateForm,
  "category_id"
> {
  business_category_id: number;
}
export interface BusinessCreateResponse {
  success: boolean;
  data: Business;
  message: string;
}

export interface BusinessAppointment extends Omit<
  Appointment,
  "final_price" | "discount"
> {
  final_price?: number | string;
  discount?: number | string;
  payment_status?: string;
  booking_code?: string;
  client?: Client;
  professional?: Professional;
  service?: Service;
}
export interface BusinessDetailStats {
  appointments: BusinessAppointment[];
  professionals: Professional[];
  services: (Service & { is_active?: boolean })[];
  clients: (Client & {
    appointments?: Appointment[];
    loyalty_points?: number;
  })[];
}
export interface BusinessChartTooltip {
  active?: boolean;
  payload?: readonly {
    name?: string;
    value?: number | string;
    color?: string;
  }[];
  label?: string | number;
}

// PUBLIC BUSINESS DETAIL
export interface BusinessProfile extends Omit<import('@/composables/booking/types').BookingBusiness, 'services' | 'professionals' | 'branches'> {
  services?: import('@/composables/booking/types').BookingService[];
  professionals?: import('@/composables/booking/types').BookingProfessional[];
  branches?: import('@/composables/booking/types').BookingBranch[];
  resources?: Resource[];
  reviews?: (Review & { client_name?: string; client?: { name: string; photo_url?: string }; is_active?: boolean })[];
  promotions?: import('@/composables/booking/types').BookingPromotion[];
  gallery?: string[];
  currency?: string;
}
export interface BusinessDetailState {
  profile: { data: BusinessProfile | null; loading: boolean; error: string | null };
  actions: { reload: () => void };
}
