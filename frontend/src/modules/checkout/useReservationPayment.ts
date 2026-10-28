import { useCallback, useEffect, useState } from "react";
import { checkoutService } from "@/modules/checkout/checkoutService";
import type {
  ReservationPaymentMode,
  ReservationPaymentPolicy,
  ReservationPaymentState,
} from "@/modules/checkout/types";

// COMPOSABLE
export const useReservationPayment = (
  businessId: number | undefined,
  total: number,
): ReservationPaymentState => {
  // STATE
  const [result, setResult] = useState<{
    businessId: number;
    policy: ReservationPaymentPolicy;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [mode, selectMode] = useState<ReservationPaymentMode | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [revision, setRevision] = useState(0);

  // DERIVED
  const policy =
    result && result.businessId === businessId ? result.policy : null;
  const allowed =
    policy?.allowed_modes.filter(
      (value) => value === "ON_SITE" || policy.online_payments_enabled,
    ) ?? [];
  const totalMinor = Math.round(total * 100);
  const dueMinor =
    mode === "ON_SITE"
      ? 0
      : mode === "DEPOSIT"
        ? Math.floor(
            (totalMinor * (policy?.deposit_percentage ?? 0) + 99) / 100,
          )
        : totalMinor;
  const ready =
    !!policy &&
    !loading &&
    !error &&
    (!policy.configured || (!!mode && allowed.includes(mode) && accepted));

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const setMode = (value: ReservationPaymentMode) => {
    selectMode(value);
    setAccepted(false);
  };

  // EFFECTS
  useEffect(() => {
    setAccepted(false);
  }, [businessId, total, policy?.version]);
  useEffect(() => {
    if (!businessId) return;
    const abort = new AbortController();
    setLoading(true);
    setError(false);
    checkoutService
      .policy(businessId, abort.signal)
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        setResult({ businessId, policy: data });
        selectMode(
          data.allowed_modes.find(
            (value) => value === "ON_SITE" || data.online_payments_enabled,
          ) ?? null,
        );
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [businessId, revision]);

  // RETURN
  return {
    policy,
    loading,
    error,
    mode,
    accepted,
    ready,
    payNow: dueMinor / 100,
    payLater: (totalMinor - dueMinor) / 100,
    setMode,
    setAccepted,
    refresh,
  };
};
