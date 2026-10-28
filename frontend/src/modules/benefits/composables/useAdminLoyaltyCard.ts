import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { adminBenefitsApi } from "@/modules/benefits/adminBenefitsApi";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import type {
  AdminCardDetail,
  AdminLoyaltyCardState,
} from "@/modules/benefits/adminTypes";
import type { BenefitResponse } from "@/modules/benefits/types";

// COMPOSABLE
export const useAdminLoyaltyCard = (id: number): AdminLoyaltyCardState => {
  // STATE
  const [data, setData] = useState<AdminCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [stampError, setStampError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = useRef(false);
  const key = useRef("");
  const realtime = useRealtimeRevision(["benefits", "loyalty"]);
  // EFFECTS
  useEffect(() => {
    setConfirming(false);
    setStampError(null);
    setSuccess(null);
  }, [id]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminBenefitsApi
      .card(id)
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError("No pudimos consultar la tarjeta.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision, realtime]);
  // ACTIONS
  const confirm = async (): Promise<void> => {
    if (busy.current || !data || data.card.id !== id || !confirming) return;
    busy.current = true;
    setPending(true);
    setStampError(null);
    try {
      await adminBenefitsApi.stamp(id, key.current);
      setConfirming(false);
      setSuccess("Sello registrado en el historial del cliente.");
      setRevision((value) => value + 1);
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null>>(cause)
        ? cause.response?.data
        : null;
      setStampError(
        response?.message ||
          "No pudimos registrar el sello. Revisa la vigencia del programa.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // RETURN
  return {
    card: {
      data: data?.card.id === id ? data : null,
      loading,
      error,
      refresh: () => setRevision((value) => value + 1),
    },
    stamp: {
      confirming,
      busy: pending,
      error: stampError,
      success,
      select: () => {
        if (!busy.current) {
          key.current = crypto.randomUUID();
          setConfirming(true);
          setSuccess(null);
          setStampError(null);
        }
      },
      cancel: () => {
        if (!busy.current) setConfirming(false);
      },
      confirm,
    },
  };
};
