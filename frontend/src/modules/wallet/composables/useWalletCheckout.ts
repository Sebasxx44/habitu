import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { mercadoPagoService } from "@/services/payment/mercadoPagoService";
import { paymentRedirect, wompiService } from "@/modules/payments/wompiService";
import type { WompiConfig } from "@/modules/payments/types";
import type { WalletCheckoutState } from "@/modules/wallet/types";
import { openWompiCheckout } from "@/modules/payments/wompiWidgetService";

// COMPOSABLE
export const useWalletCheckout = (onCreated: () => void): WalletCheckoutState => {
  // STATE
  const [, setParams] = useSearchParams();
  const [config, setConfig] = useState<WompiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [provider, setProvider] = useState<"wompi" | "mercadopago">("wompi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const idempotency = useRef<{ amount: number; key: string } | null>(null);
  const value = Number(amount);
  const enabled =
    provider === "wompi" ? config?.enabled : config?.mercadopago_enabled;
  // COMPUTED
  const validAmount =
    Number.isFinite(value) &&
    value >= (config?.min_amount ?? 5000) &&
    value <= (config?.max_amount ?? 5000000) &&
    /^\d+(\.\d{1,2})?$/.test(amount);
  const valid = !!enabled && validAmount && !loading && !failed;

  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setFailed(false);
    wompiService
      .config(abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setConfig(value);
          if (!value.enabled && value.mercadopago_enabled)
            setProvider("mercadopago");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);

  // ACTIONS
  const trackOrder = (id: string, transactionId?: string) => {
    setParams((current) => {
      current.set("checkout", id);
      if (transactionId) current.set("id", transactionId);
      else current.delete("id");
      current.delete("status");
      return current;
    }, { replace: true });
    onCreated();
  };
  const submit = async () => {
    if (!valid || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      if (provider === "wompi") {
        if (idempotency.current?.amount !== value)
          idempotency.current = { amount: value, key: crypto.randomUUID() };
        const order = await wompiService.wallet(value, idempotency.current.key);
        if (!order.checkout_url) {
          idempotency.current = null;
          trackOrder(order.id);
          if (order.status === "APPROVED" || order.status === "REVIEW") return;
          throw new Error("Checkout closed");
        }
        onCreated();
        await openWompiCheckout(order, (transactionId) =>
          trackOrder(order.id, transactionId),
        );
      } else {
        const preference = await mercadoPagoService.createWalletPreference(
          value,
          "Recarga de billetera",
        );
        paymentRedirect(preference.init_point, provider);
      }
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  // RETURN
  return {
    config: { value: config, loading, failed, retry: () => setRevision((current) => current + 1) },
    selection: {
      amount,
      value,
      provider,
      valid,
      validAmount,
      setAmount: (value) => {
        setAmount(value);
        setError(false);
      },
      setProvider,
    },
    submission: { busy, error, submit },
  };
};
