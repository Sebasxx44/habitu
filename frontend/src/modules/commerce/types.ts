// TYPES
export interface CommerceOption {
  id: number;
  name: string;
  duration_minutes?: number;
}
export interface ServicePackage {
  id: number;
  business_id: number;
  name: string;
  description: string | null;
  service_ids: number[];
  is_active: boolean;
}
export interface GiftVoucher {
  id: string;
  code: string;
  business_id: number;
  service_id: number;
  status: string;
  claimed: boolean;
  expires_at: string;
  appointment_id: number | null;
  redeemed_at: string | null;
  snapshot: {
    service_name: string;
    business_name: string;
    duration_minutes: number;
    restrictions: string;
    cash_collected: boolean;
  };
  events: { type: string; created_at: string }[];
}
export interface PackageProposal {
  id: string;
  status: string;
  expires_at: string;
  snapshot: {
    package_name: string;
    date: string;
    total: string;
    currency: string;
    cancellation_terms: string | null;
    items: {
      service_name: string;
      request: {
        service_id: number;
        date: string;
        start_time: string;
        duration_minutes: number;
      };
      end_time: string;
      quote: {
        total: number;
        professional: { id: number; name: string | null } | null;
        resource: { id: number; name: string | null } | null;
      };
      terms: {
        allow_cancellation: boolean;
        cancellation_notice_minutes: number;
        allow_reschedule: boolean;
        reschedule_notice_minutes: number;
      };
    }[];
  };
  appointments: {
    id: number;
    booking_code: string;
    status: string;
    payment_status: string;
  }[];
}
export interface CommerceContext {
  businesses: CommerceOption[];
  business_id: number;
  can_manage: boolean;
  branches: CommerceOption[];
  services: CommerceOption[];
  packages: ServicePackage[];
  gifts: GiftVoucher[];
}
export interface CommerceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface CommerceError {
  message?: string;
  errors?: Record<string, string[]>;
}
export interface PackageForm {
  name: string;
  description: string;
  serviceIds: number[];
}
export interface GiftForm {
  serviceId: string;
  expiresAt: string;
  restrictions: string;
}
export interface PackageBookingForm {
  branchId: string;
  date: string;
  startTime: string;
}
export interface CommerceContextState {
  listing: {
    data: CommerceContext | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  selection: { businessId: string; setBusinessId: (id: string) => void };
}
export interface PackageManagerState {
  editor: { form: PackageForm; busy: boolean; error: string | null };
  actions: {
    setField: (field: "name" | "description", value: string) => void;
    toggleService: (id: number) => void;
    save: () => Promise<void>;
    remove: (id: number) => Promise<void>;
  };
}
export interface PackageBookingState {
  booking: {
    form: PackageBookingForm;
    proposal: PackageProposal | null;
    busy: boolean;
    error: string | null;
    accepted: boolean;
  };
  actions: {
    setField: (field: keyof PackageBookingForm, value: string) => void;
    setAccepted: (value: boolean) => void;
    preview: () => Promise<void>;
    confirm: () => Promise<void>;
  };
}
export interface GiftActionsState {
  gifts: {
    form: GiftForm;
    code: string;
    appointmentId: string;
    busy: boolean;
    error: string | null;
    result: GiftVoucher | null;
  };
  actions: {
    setField: (field: keyof GiftForm, value: string) => void;
    setCode: (value: string) => void;
    setAppointmentId: (value: string) => void;
    issue: () => Promise<void>;
    claim: () => Promise<void>;
    redeem: () => Promise<void>;
  };
}
