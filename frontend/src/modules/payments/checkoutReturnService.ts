import { wompiService } from "@/modules/payments/wompiService";
import type {
  CheckoutOrder,
  CheckoutReturnResult,
} from "@/modules/payments/types";

// SERVICE
export const readCheckoutReturn = async (
  orderId: string,
  transactionId: string | null,
  purpose: CheckoutOrder["purpose"],
  signal?: AbortSignal,
): Promise<CheckoutReturnResult> => {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      orderId,
    ) ||
    (transactionId !== null && !/^[a-zA-Z0-9-]{1,100}$/.test(transactionId))
  )
    throw new Error("Invalid payment return");

  let order: CheckoutOrder;
  let verificationPending = false;
  if (transactionId) {
    try {
      // The browser provides an identifier; only our server verifies the payment.
      order = await wompiService.reconcile(orderId, transactionId, signal);
    } catch (cause) {
      if (signal?.aborted) throw cause;
      verificationPending = true;
      order = await wompiService.order(orderId, signal);
    }
  } else {
    order = await wompiService.order(orderId, signal);
  }

  if (order.purpose !== purpose) throw new Error("Invalid payment purpose");

  // Keep a returned transaction under verification instead of inviting a second charge.
  return {
    order: transactionId
      ? { ...order, checkout_url: null, checkout_options: null }
      : order,
    verificationPending,
  };
};
