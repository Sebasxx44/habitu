import type { CheckoutRefund, CheckoutSnapshot } from '@/modules/checkout/types';
// TYPES
export type CheckoutStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR"
  | "EXPIRED"
  | "REVIEW";
export interface WompiConfig {
  enabled: boolean;
  environment: "test" | "prod";
  min_amount: number;
  max_amount: number;
  mercadopago_enabled?: boolean;
}
export interface CheckoutOrder {
  id: string;
  reference: string;
  purpose: "wallet" | "membership" | "reservation";
  resolution?: string | null;
  snapshot?: CheckoutSnapshot | null;
  refunds?: CheckoutRefund[];
  target_id: number | null;
  amount: string;
  currency: string;
  status: CheckoutStatus;
  environment: "test" | "prod";
  expires_at: string;
  created_at: string;
  payment_method: string | null;
  checkout_url: string | null;
  checkout_options?: WompiWidgetOptions | null;
}

export interface CheckoutReturnResult {
  order: CheckoutOrder;
  verificationPending: boolean;
}

export interface WompiWidgetOptions {
  publicKey: string;
  currency: "COP";
  amountInCents: number;
  reference: string;
  signature: { integrity: string };
  expirationTime: string;
  redirectUrl: string;
}

export interface WompiWidgetResult {
  transaction?: { id: string; status?: string };
}

export interface WompiWidgetInstance {
  open: (onComplete: (result: WompiWidgetResult) => void) => void;
}

export interface WompiWidgetConstructor {
  new (options: WompiWidgetOptions): WompiWidgetInstance;
}
