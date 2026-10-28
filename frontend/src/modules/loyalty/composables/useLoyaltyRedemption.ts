import { useRef, useState } from "react";
import axios from "axios";
import { redeemLoyaltyCard } from "@/modules/loyalty/loyaltyService";
import { useToast } from "@/components/ui/Toast";
import type {
  LoyaltyCard,
  LoyaltyRedemptionState,
} from "@/modules/loyalty/types";

export const useLoyaltyRedemption = (
  onSuccess: () => void,
): LoyaltyRedemptionState => {
  // STATE
  const [selected, setSelected] = useState<LoyaltyCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKeys = useRef(new Map<number, string>());
  const running = useRef(false);
  const { addToast } = useToast();

  // ACTIONS
  const select = (card: LoyaltyCard): void => {
    if (running.current || !card.available) return;
    setSelected(card);
    setError(null);
  };

  const close = (): void => {
    if (running.current) return;
    setSelected(null);
    setError(null);
  };

  const confirm = async (): Promise<void> => {
    if (!selected || running.current) return;
    const card = selected;
    const key = requestKeys.current.get(card.id) || crypto.randomUUID();
    requestKeys.current.set(card.id, key);
    running.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemLoyaltyCard(card.id, key);
      requestKeys.current.delete(card.id);
      setSelected(null);
      addToast(
        result.message || "Recompensa canjeada correctamente",
        "success",
      );
      onSuccess();
    } catch (error) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data.message
        : undefined;
      setError(
        message ||
          "No pudimos confirmar el canje. Reintenta para consultar el mismo intento sin duplicarlo.",
      );
    } finally {
      running.current = false;
      setSubmitting(false);
    }
  };

  // PUBLIC API
  return {
    redemption: { selected, submitting, error, select, close, confirm },
  };
};
