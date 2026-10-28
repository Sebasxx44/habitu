import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { cancelWithdrawal } from "@/modules/earnings/earningsService";
import type { WithdrawalHistoryState } from "@/modules/earnings/types";

// COMPOSABLE
export const useWithdrawalHistory = (
  refresh: () => void,
): WithdrawalHistoryState => {
  // STATE
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  // ACTIONS
  const cancel = async (id: number): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusyId(id);
    setError(null);
    try {
      await cancelWithdrawal(id);
      refresh();
    } catch (failure) {
      setError(
        isAxiosError<{ message?: string }>(failure)
          ? failure.response?.data.message || "No se pudo cancelar el retiro."
          : "No se pudo cancelar el retiro.",
      );
    } finally {
      running.current = false;
      setBusyId(null);
    }
  };

  // PUBLIC API
  return { cancellation: { busyId, error }, actions: { cancel } };
};
