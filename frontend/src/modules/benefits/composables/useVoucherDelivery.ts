import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { adminBenefitsApi } from "@/modules/benefits/adminBenefitsApi";
import type { BenefitResponse } from "@/modules/benefits/types";
import type { VoucherDeliveryState } from "@/modules/benefits/adminTypes";

// COMPOSABLE
export const useVoucherDelivery = (
  refresh: () => void,
): VoucherDeliveryState => {
  const { t } = useTranslation("benefits");
  // STATE
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const busy = useRef(false);
  // ACTIONS
  const select = (value: string) => {
    if (busy.current) return;
    setCode(value);
    setError(null);
    setSuccess(false);
    setConfirming(true);
  };
  const close = () => {
    if (!busy.current) setConfirming(false);
  };
  const confirm = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await adminBenefitsApi.consume(code.trim());
      setSuccess(true);
      setConfirming(false);
      setCode("");
      refresh();
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null>>(cause)
        ? cause.response?.data
        : undefined;
      setError(response?.message || response?.error || t("saveError"));
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  // RETURN
  return {
    delivery: { code, confirming, busy: pending, error, success },
    actions: { setCode, select, close, confirm },
  };
};
