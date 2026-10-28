import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { wompiService } from "@/modules/payments/wompiService";
import { openWompiCheckout } from "@/modules/payments/wompiWidgetService";
import type { CheckoutOrder } from "@/modules/payments/types";
import type { WalletOrderActions } from "@/modules/wallet/types";

// COMPOSABLE
export const useWalletOrderActions = (
  onRefresh: () => void,
): WalletOrderActions => {
  // STATE
  const [, setParams] = useSearchParams();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const locked = useRef(false);

  // ACTIONS
  const track = (id: string, transactionId?: string) => {
    setParams(
      (params) => {
        params.set("checkout", id);
        if (transactionId) params.set("id", transactionId);
        else params.delete("id");
        params.delete("status");
        return params;
      },
      { replace: true },
    );
    onRefresh();
  };

  const resume = async (order: CheckoutOrder) => {
    if (locked.current) return;
    locked.current = true;
    setOpeningId(order.id);
    setErrorId(null);
    try {
      const current = await wompiService.order(order.id);
      if (!current.checkout_url) {
        track(current.id);
        return;
      }
      await openWompiCheckout(current, (transactionId) =>
        track(current.id, transactionId),
      );
    } catch {
      setErrorId(order.id);
    } finally {
      locked.current = false;
      setOpeningId(null);
    }
  };

  // RETURN
  return { state: { openingId, errorId }, actions: { resume } };
};
