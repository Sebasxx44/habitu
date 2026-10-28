import { useEffect, useState } from "react";
import { checkoutService } from "@/modules/checkout/checkoutService";
import type {
  PaymentPolicyEditorState,
  ReservationPaymentMode,
  ReservationPaymentPolicy,
} from "@/modules/checkout/types";

// COMPOSABLE
export const usePaymentPolicyEditor = (
  businessId: number,
): PaymentPolicyEditorState => {
  // STATE
  const [policy, setPolicy] = useState<ReservationPaymentPolicy | null>(null);
  const [modes, setModes] = useState<ReservationPaymentMode[]>([]);
  const [deposit, setDeposit] = useState(30);
  const [minutes, setMinutes] = useState(15);
  const [terms, setTerms] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  // ACTIONS
  const toggle = (mode: ReservationPaymentMode) =>
    setModes((current) =>
      current.includes(mode)
        ? current.filter((value) => value !== mode)
        : [...current, mode],
    );
  const save = async () => {
    if (busy || !businessId) return;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      const { data } = await checkoutService.updatePolicy(businessId, {
        allowed_modes: modes,
        deposit_percentage: modes.includes("DEPOSIT") ? deposit : null,
        hold_minutes: minutes,
        cancellation_terms: terms,
      });
      setPolicy(data);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setSaved(false);
    checkoutService
      .policy(businessId, abort.signal)
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        setPolicy(data);
        setModes(data.allowed_modes);
        setDeposit(data.deposit_percentage ?? 30);
        setMinutes(data.hold_minutes);
        setTerms(data.cancellation_terms ?? "");
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [businessId]);
  // RETURN
  return {
    form: {
      modes,
      toggle,
      deposit,
      setDeposit,
      minutes,
      setMinutes,
      terms,
      setTerms,
    },
    status: {
      loading,
      busy,
      error,
      saved,
      configured: policy?.configured ?? false,
      online: policy?.online_payments_enabled ?? false,
    },
    save,
  };
};
