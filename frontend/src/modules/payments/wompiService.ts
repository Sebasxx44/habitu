import { httpService } from "@/services/auth/authService";
import type { BookingApiResponse } from "@/composables/booking/types";
import type { CheckoutOrder, WompiConfig } from "@/modules/payments/types";

// SERVICE
export const wompiService = {
  config: async (signal?: AbortSignal): Promise<WompiConfig> =>
    (
      await httpService.get<BookingApiResponse<WompiConfig>>(
        "/v2/wompi/config",
        { signal },
      )
    ).data,
  wallet: async (amount: number, key: string): Promise<CheckoutOrder> =>
    (
      await httpService.post<BookingApiResponse<CheckoutOrder>>(
        "/v2/wompi/wallet",
        { amount, idempotency_key: key },
      )
    ).data,
  order: async (id: string, signal?: AbortSignal): Promise<CheckoutOrder> =>
    (
      await httpService.get<BookingApiResponse<CheckoutOrder>>(
        `/v2/wompi/orders/${encodeURIComponent(id)}`,
        { signal },
      )
    ).data,
  reconcile: async (
    id: string,
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<CheckoutOrder> =>
    (
      await httpService.post<BookingApiResponse<CheckoutOrder>>(
        `/v2/wompi/orders/${encodeURIComponent(id)}/reconcile`,
        { transaction_id: transactionId },
        { signal },
      )
    ).data,
  history: async (signal?: AbortSignal): Promise<CheckoutOrder[]> =>
    (
      await httpService.get<BookingApiResponse<CheckoutOrder[]>>(
        "/v2/wompi/orders",
        { signal },
      )
    ).data,
};
export { paymentRedirect } from "@/modules/payments/redirect";
