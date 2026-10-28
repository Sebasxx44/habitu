import { paymentRedirect } from "@/modules/payments/redirect";
import type {
  CheckoutOrder,
  WompiWidgetConstructor,
} from "@/modules/payments/types";

// TYPES
declare global {
  interface Window {
    WidgetCheckout?: WompiWidgetConstructor;
  }
}

// CONSTANTS
const SCRIPT_URL = "https://checkout.wompi.co/widget.js";
const SCRIPT_ID = "habitu-wompi-checkout";
const LOAD_TIMEOUT_MS = 12000;

// STATE
let pendingScript: Promise<WompiWidgetConstructor> | null = null;

// SERVICES
const loadWidget = (): Promise<WompiWidgetConstructor> => {
  if (window.WidgetCheckout) return Promise.resolve(window.WidgetCheckout);
  if (pendingScript) return pendingScript;

  pendingScript = new Promise<WompiWidgetConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";

    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
    };
    const failed = () => {
      cleanup();
      script.remove();
      reject(new Error("Wompi checkout could not be loaded"));
    };
    const loaded = () => {
      if (!window.WidgetCheckout) {
        failed();
        return;
      }
      cleanup();
      resolve(window.WidgetCheckout);
    };
    const timer = setTimeout(failed, LOAD_TIMEOUT_MS);
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    document.head.appendChild(script);
  }).catch((error: Error) => {
    pendingScript = null;
    throw error;
  });
  return pendingScript;
};

export const openWompiCheckout = async (
  order: CheckoutOrder,
  onComplete: (transactionId?: string) => void,
): Promise<void> => {
  if (order.status !== "PENDING" || !order.checkout_url)
    throw new Error("Checkout is no longer available");

  if (!order.checkout_options) {
    paymentRedirect(order.checkout_url, "wompi");
    return;
  }

  let WidgetCheckout: WompiWidgetConstructor;
  try {
    WidgetCheckout = await loadWidget();
  } catch {
    // The same server-signed order can use web checkout if the widget is blocked.
    paymentRedirect(order.checkout_url, "wompi");
    return;
  }

  const checkout = new WidgetCheckout(order.checkout_options);
  checkout.open((result) => {
    // A widget result is only a prompt to read our server's verified state.
    onComplete(result.transaction?.id);
  });
};
