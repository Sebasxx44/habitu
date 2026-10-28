import { httpService } from "@/services/auth/authService";
import type {
  CheckoutRefund,
  ReservationCheckoutRequest,
  ReservationCheckoutResult,
  ReservationPaymentPolicy,
} from "@/modules/checkout/types";

// SERVICES
export const checkoutService = {
  policy: (
    businessId: number,
    signal?: AbortSignal,
  ): Promise<{ data: ReservationPaymentPolicy }> =>
    httpService.get("/v2/booking/checkout/policy", {
      params: { business_id: businessId },
      signal,
    }),
  create: (
    data: ReservationCheckoutRequest,
  ): Promise<{ data: ReservationCheckoutResult }> =>
    httpService.post("/v2/booking/checkout", data),
  updatePolicy: (
    businessId: number,
    data: Pick<
      ReservationPaymentPolicy,
      | "allowed_modes"
      | "deposit_percentage"
      | "hold_minutes"
      | "cancellation_terms"
    >,
  ): Promise<{ data: ReservationPaymentPolicy }> =>
    httpService.put(`/v2/booking/checkout/policy/${businessId}`, data),
  refund: (
    orderId: string,
    data: { amount: string; reason: string; idempotency_key: string },
  ): Promise<{ data: CheckoutRefund }> =>
    httpService.post(
      `/v2/wompi/orders/${encodeURIComponent(orderId)}/refunds`,
      data,
    ),
};
