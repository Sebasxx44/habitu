import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { commerceService } from "@/modules/commerce/commerceService";
import type {
  CommerceError,
  GiftActionsState,
  GiftForm,
  GiftVoucher,
} from "@/modules/commerce/types";

// COMPOSABLE
export const useGiftActions = (
  businessId: number,
  refresh: () => void,
): GiftActionsState => {
  // STATE
  const [form, setForm] = useState<GiftForm>({
    serviceId: "",
    expiresAt: "",
    restrictions: "",
  });
  const [code, setCode] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GiftVoucher | null>(null);
  const running = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  // ACTIONS
  const run = async (action: () => Promise<GiftVoucher>): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await action());
      refresh();
    } catch (failure) {
      const data = isAxiosError<CommerceError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(data?.errors || {}).flat()[0] ||
          data?.message ||
          "No se pudo actualizar el vale.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const setField = (field: keyof GiftForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const issue = () =>
    run(async () => {
      const fingerprint = JSON.stringify(form);
      if (intent.current?.fingerprint !== fingerprint)
        intent.current = { fingerprint, key: crypto.randomUUID() };
      return (await commerceService.issue(businessId, form, intent.current.key))
        .data;
    });
  const claim = () =>
    run(async () => (await commerceService.claim(code.trim())).data);
  const redeem = () =>
    run(
      async () =>
        (await commerceService.redeem(code.trim(), appointmentId)).data,
    );
  // PUBLIC API
  return {
    gifts: { form, code, appointmentId, busy, error, result },
    actions: { setField, setCode, setAppointmentId, issue, claim, redeem },
  };
};
