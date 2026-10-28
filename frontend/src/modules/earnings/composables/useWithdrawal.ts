import { useRef, useState } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/Toast";
import { requestWithdrawal } from "@/modules/earnings/earningsService";
import type { WithdrawalForm, WithdrawalState } from "@/modules/earnings/types";

export const useWithdrawal = (
  balance: number,
  currency: string | undefined,
  onSuccess: () => void,
): WithdrawalState => {
  // STATE
  const [open, setOpenState] = useState(false);
  const [form, setForm] = useState<WithdrawalForm>({
    amount: "",
    bankAccount: "",
    bankName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const { addToast } = useToast();

  // ACTIONS
  const setOpen = (next: boolean): void => {
    if (!running.current) {
      setOpenState(next);
      setError(null);
    }
  };
  const setField = (field: keyof WithdrawalForm, value: string): void => {
    if (!running.current)
      setForm((current) => ({ ...current, [field]: value }));
  };
  const submit = async (): Promise<void> => {
    if (running.current) return;
    const amount = Number(form.amount);
    if (
      !currency ||
      !Number.isFinite(amount) ||
      amount < 10000 ||
      amount > balance ||
      !/^\d+(\.\d{1,2})?$/.test(form.amount)
    ) {
      setError(
        "Ingresa un monto válido desde 10.000, con máximo dos decimales y dentro de tu saldo disponible.",
      );
      return;
    }
    if (!form.bankAccount.trim() || !form.bankName.trim()) {
      setError("Completa el banco y el número de cuenta.");
      return;
    }
    running.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const fingerprint = JSON.stringify([
        form.amount,
        form.bankAccount.trim(),
        form.bankName.trim(),
      ]);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = { fingerprint, key: crypto.randomUUID() };
      const result = await requestWithdrawal(form, attempt.current.key);
      attempt.current = null;
      addToast(
        result.message ||
          "Solicitud enviada. El retiro está pendiente de procesamiento.",
        "success",
      );
      setOpenState(false);
      setForm({ amount: "", bankAccount: "", bankName: "" });
      onSuccess();
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data.message
        : undefined;
      setError(
        message ||
          "No se pudo confirmar la solicitud. Actualiza tus movimientos antes de volver a intentarlo.",
      );
    } finally {
      running.current = false;
      setSubmitting(false);
    }
  };

  // PUBLIC API
  return {
    withdrawal: { open, form, submitting, error, setOpen, setField, submit },
  };
};
