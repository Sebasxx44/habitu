import type {
  BookingAppointment,
  BookingCreateRequest,
} from "@/composables/booking/types";
import type { CheckoutOrder } from "@/modules/payments/types";

// TYPES
export type ReservationPaymentMode = "FULL" | "DEPOSIT" | "ON_SITE";
interface PaymentPolicyBase {
  allowed_modes: ReservationPaymentMode[];
  deposit_percentage: number | null;
  hold_minutes: number;
  online_payments_enabled: boolean;
  saved_payment_methods_enabled: false;
}
export type ReservationPaymentPolicy = PaymentPolicyBase &
  (
    | { configured: true; cancellation_terms: string; version: number }
    | { configured: false; cancellation_terms: null; version: null }
  );
export interface CheckoutSnapshot {
  subtotal: string;
  discount: string;
  total: string;
  pay_now: string;
  pay_later: string;
  currency: string;
  cancellation_terms: string;
  payment_mode: ReservationPaymentMode;
  policy_version: number;
  accepted_at: string;
}
export interface ReservationCheckoutResult {
  appointment: BookingAppointment;
  payment_order: CheckoutOrder | null;
  snapshot: CheckoutSnapshot;
}
export interface ReservationCheckoutRequest extends BookingCreateRequest {
  payment_mode: ReservationPaymentMode;
  expected_policy_version: number;
  accepted_terms: true;
  idempotency_key: string;
  expected_total: number;
}
export interface CheckoutRefund {
  id: string;
  amount: string;
  currency: string;
  status: "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED";
  reason: string;
  provider_reference: string | null;
  completed_at: string | null;
  automatic_processing_enabled: boolean;
}
export interface ReservationPaymentState {
  policy: ReservationPaymentPolicy | null;
  loading: boolean;
  error: boolean;
  mode: ReservationPaymentMode | null;
  accepted: boolean;
  ready: boolean;
  payNow: number;
  payLater: number;
  setMode: (mode: ReservationPaymentMode) => void;
  setAccepted: (value: boolean) => void;
  refresh: () => void;
}
export interface CheckoutReturnState {
  order: CheckoutOrder | null;
  loading: boolean;
  busy: boolean;
  error: boolean;
  checking: boolean;
  refund: {
    amount: string;
    reason: string;
    setAmount: (value: string) => void;
    setReason: (value: string) => void;
    request: () => Promise<void>;
  };
  refresh: () => void;
  pay: () => Promise<void>;
}

export interface PaymentPolicyEditorState {
  form: {
    modes: ReservationPaymentMode[];
    toggle: (mode: ReservationPaymentMode) => void;
    deposit: number;
    setDeposit: (value: number) => void;
    minutes: number;
    setMinutes: (value: number) => void;
    terms: string;
    setTerms: (value: string) => void;
  };
  status: {
    loading: boolean;
    busy: boolean;
    error: boolean;
    saved: boolean;
    configured: boolean;
    online: boolean;
  };
  save: () => Promise<void>;
}
