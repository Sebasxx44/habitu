import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { readCheckoutReturn } from "@/modules/payments/checkoutReturnService";
import { openWompiCheckout } from "@/modules/payments/wompiWidgetService";
import { checkoutService } from "@/modules/checkout/checkoutService";
import type { CheckoutOrder } from "@/modules/payments/types";
import type { CheckoutReturnState } from "@/modules/checkout/types";

// COMPOSABLE
export const useCheckoutReturn = (): CheckoutReturnState => {
  // STATE
  const { orderId = "" } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [transactionId, setTransactionId] = useState(params.get("id") ?? "");
  const refundKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef(false);

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const pay = async () => {
    if (!order || busy || checking || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      await openWompiCheckout(order, (id) => {
        if (id) setTransactionId(id);
        refresh();
      });
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const request = async () => {
    if (!order || busy || inFlight.current) return;
    const fingerprint = `${order.id}|${amount}|${reason}`;
    if (refundKey.current?.fingerprint !== fingerprint)
      refundKey.current = { fingerprint, key: crypto.randomUUID() };
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      await checkoutService.refund(order.id, {
        amount,
        reason,
        idempotency_key: refundKey.current.key,
      });
      refresh();
    } catch {
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    setLoading(true);
    setOrder(null);
    setError(false);
    const read = async () => {
      if (abort.signal.aborted) return;
      try {
        setChecking(true);
        const { order: value, verificationPending } = await readCheckoutReturn(
          orderId,
          transactionId || null,
          "reservation",
          abort.signal,
        );
        if (abort.signal.aborted) return;
        setError(verificationPending);
        setOrder(value);
        if (["PENDING", "REVIEW"].includes(value.status) && ++attempts < 12)
          timer = setTimeout(() => {
            void read();
          }, 10000);
      } catch {
        if (!abort.signal.aborted) setError(true);
      } finally {
        if (!abort.signal.aborted) {
          setChecking(false);
          setLoading(false);
        }
      }
    };
    void read();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [orderId, revision, transactionId]);

  // RETURN
  return {
    order,
    loading,
    busy,
    error,
    checking,
    refresh,
    pay,
    refund: { amount, setAmount, reason, setReason, request },
  };
};
