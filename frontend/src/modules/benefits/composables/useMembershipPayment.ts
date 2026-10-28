import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { paymentRedirect } from "@/modules/payments/wompiService";
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { benefitsApi } from "@/modules/benefits/benefitsApi";
import { readCheckoutReturn } from "@/modules/payments/checkoutReturnService";
import type {
  BenefitResponse,
  MembershipCheckout,
  MembershipPaymentState,
  WompiConfig,
} from "@/modules/benefits/types";

// COMPOSABLE
export const useMembershipPayment = (
  orderId: string | null,
  onApproved: () => void,
): MembershipPaymentState => {
  const realtimeRevision = useRealtimeRevision(["benefits","wallet"]);
  const { t } = useTranslation("benefits");
  // STATE
  const [params] = useSearchParams();
  const transactionId = params.get("id");
  const [config, setConfig] = useState<WompiConfig | null>(null);
  const [order, setOrder] = useState<MembershipCheckout | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const keys = useRef<Record<number, string>>({});
  const refreshCatalog = useRef(onApproved);
  refreshCatalog.current = onApproved;
  // EFFECTS
  useEffect(() => {
    let active = true;
    benefitsApi
      .paymentConfig()
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch(() => {
        if (active) setConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setOrder(null);
    if (!orderId) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const read = async () => {
      try {
        const { order: result, verificationPending } = await readCheckoutReturn(
          orderId,
          transactionId,
          "membership",
          abort.signal,
        );
        if (abort.signal.aborted) return;
        setOrder(result);
        setError(verificationPending ? t("payment.loadError") : null);
        if (result.status === "APPROVED") refreshCatalog.current();
        else if (["PENDING", "EXPIRED"].includes(result.status) && ++attempts < 12)
          timer = setTimeout(() => void read(), 10000);
      } catch {
        if (!abort.signal.aborted) setError(t("payment.loadError"));
      }
    };
    void read();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [orderId, transactionId, t, realtimeRevision]);
  // ACTIONS
  const start = async (planId: number) => {
    if (busy.current || !config?.enabled) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      keys.current[planId] ??= crypto.randomUUID();
      const result = await benefitsApi.checkout(planId, keys.current[planId]);
      setOrder(result);
      paymentRedirect(result.checkout_url || "", "wompi");
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null>>(cause)
        ? cause.response?.data
        : undefined;
      setError(response?.message || response?.error || t("payment.error"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const refresh = async () => {
    if (!orderId || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const { order: result, verificationPending } = await readCheckoutReturn(
        orderId,
        transactionId,
        "membership",
      );
      setOrder(result);
      setError(verificationPending ? t("payment.loadError") : null);
      if (result.status === "APPROVED") refreshCatalog.current();
    } catch {
      setError(t("payment.loadError"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // RETURN
  return {
    payment: { config, order, pending, error },
    actions: { start, refresh },
  };
};
