import type { ReservationPaymentState } from '@/modules/checkout/types';
import type { DynamicPrice } from '@/modules/pricing/types';
import type {
  Branch,
  Business,
  Professional,
  Resource,
  Service,
} from "@/types/models";

// TYPES
export interface BookingBusiness extends Business {
  uses_professionals?: boolean;
  uses_resources?: boolean;
  main_branch?: Branch;
  mainBranch?: Branch;
  payment_methods?: BookingPaymentMethod[];
  photo_url?: string;
  city?: { name: string };
}
export interface BookingPaymentMethod {
  id: string | number;
  name: string;
}
export interface BookingAppointment {
  id: number;
  duration_minutes?: number;
  participants?: number;
  booking_model?: Service['booking_model'];
  date: string;
  status?: string;
  timezone?: string;
  currency?: string;
  final_price?: number | string;
  discount_amount?: number | string;
  branch?: BookingBranch;
  time?: string;
  start_time?: string;
  end_time?: string;
  booking_code?: string;
  branch_id?: number;
  business_id?: number;
  barber_shop_id?: number;
  barbershop_id?: number;
  professional_id?: number;
  barber_id?: number;
  resource_id?: number;
  service_id: number;
  business?: BookingBusiness;
  barberShop?: BookingBusiness;
  service?: Service;
  professional?: Professional;
  barber?: Professional;
  resource?: Resource;
  client?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    photo_url?: string;
  };
}
export interface BookingRequest {
  business_id: number;
  branch_id: number;
  service_id: number;
  professional_id?: number;
  resource_id?: number;
  date: string;
  appointment_id?: number;
  duration_minutes?: number;
  participants?: number;
}
export interface BookingCreateRequest extends BookingRequest {
  client_id?: number;
  idempotency_key?: string;
  expected_total?: number;
  promo_code?: string;
  start_time: string;
  notes?: string;
  source: "web";
}
export interface BookingSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  professional_id?: number | null;
  professional_name?: string | null;
  resource_id?: number | null;
  price?: number;
  duration_minutes?: number;
  resource_name?: string | null;
  remaining_capacity?: number;
  participants?: number;
  booking_model?: Service['booking_model'];
}
export interface BookingAvailability {
  date: string;
  timezone: string;
  slots: BookingSlot[];
  professionals?: BookingProfessional[];
}
export interface BookingApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
export interface BookingApiError {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}
export interface BookingAvailabilityState {
  availability: {
    slots: BookingSlot[];
    loading: boolean;
    error: string | null;
    timezone: string;
  };
  actions: { reload: () => void };
}

// RESERVATION FLOW
export interface BookingProfessional extends Professional { services?: { id: number }[]; branch_ids?: number[] }
export interface BookingService extends Service { professionals?: BookingProfessional[]; is_active?: boolean; currency?: string }
export interface BookingBranch extends Branch { schedules?: { day: number | string; open_time: string; close_time: string; is_closed: boolean }[] }
export interface BookingPromotion { id: number; title: string; description?: string; promo_code?: string; discount: number | string; type: string; start_date: string; end_date: string; is_active: boolean; services?: { id: number }[] }
export interface BookingContext { serviceId?: number; professionalId?: number; branchId?: number; resourceId?: number; date?: string; time?: string; promoCode?: string; durationMinutes?: number; participants?: number; source?: 'marketplace' | 'assistant' | 'express' }
export interface BookingAccountState {
  identity: { authenticated: boolean; canBook: boolean };
  actions: { requireAccount: () => boolean };
}
export type BookingStep = 'service' | 'professional' | 'datetime' | 'review';
export interface BookingSelection { serviceId: number | null; professionalId: number | null; resourceId: number | null; branchId: number | null; date: string; time: string; durationMinutes: number; participants: number }
export interface BookingQuoteRequest extends BookingRequest { start_time: string; promo_code?: string }
export interface BookingQuote { dynamic_pricing?: DynamicPrice; membership?: {id: number; plan_id: number; name: string; included_appointment: boolean; expires_at: string} | null; subtotal: number; discount: number; total: number; currency: string; duration_minutes: number; timezone: string; professional: { id: number; name: string } | null; resource_id: number | null; resource?: {id: number; name: string} | null; participants?: number; remaining_capacity?: number; booking_model?: Service['booking_model']; promotion: { id: number; title: string; code: string } | null }
export interface BookingFlowState {
  notice: string | null;
  availability: BookingAvailabilityState["availability"];
  selection: BookingSelection;
  journey: { step: BookingStep; steps: BookingStep[]; index: number; model: NonNullable<Service['booking_model']>; durations: number[]; service: BookingService | null; professional: BookingProfessional | null; resource: Resource | null; branch: BookingBranch | null; professionals: BookingProfessional[]; resources: Resource[]; requiresProfessional: boolean; requiresResource: boolean; canContinue: boolean; selectedSlot: BookingSlot | null; request: BookingRequest | null };
  actions: { service: (id: number) => void; professional: (id: number | null) => void; resource: (id: number | null) => void; branch: (id: number) => void; date: (date: string) => void; time: (time: string, resourceId?: number | null) => void; duration: (minutes: number) => void; participants: (count: number) => void; reloadAvailability: () => void; next: () => void; back: () => void; step: (step: BookingStep) => void };
}
export interface BookingCheckoutState {
  payment: ReservationPaymentState;
  summary: { quote: BookingQuote | null; loading: boolean; error: string | null; promoCode: string; appliedCode: string; notes: string };
  submission: { submitting: boolean; error: string | null; appointment: BookingAppointment | null };
  actions: { setPromoCode: (value: string) => void; applyPromo: () => void; selectPromo: (code: string) => void; removePromo: () => void; setNotes: (value: string) => void; retry: () => void; confirm: () => Promise<void> };
}
