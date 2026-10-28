import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { benefitsApi } from "@/modules/benefits/benefitsApi";
import type {
  BenefitAction,
  BenefitActionsState,
  BenefitResponse,
} from "@/modules/benefits/types";

// COMPOSABLE
export const useBenefitActions = (refresh: () => void): BenefitActionsState => {
  const { t } = useTranslation("benefits");
  // STATE
  const [selected, setSelected] = useState<BenefitAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = useRef(false);
  const key = useRef("");
  // ACTIONS
  const select = (action: BenefitAction) => {
    if (busy.current) return;
    setSelected(action);
    setError(null);
    key.current = crypto.randomUUID();
  };
  const close = () => {
    if (!busy.current) {
      setSelected(null);
      setError(null);
    }
  };
  const confirm = async () => {
    if (!selected || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      if (selected.kind === "join") await benefitsApi.join(selected.program.id);
      if (selected.kind === "redeem" && selected.program.card)
        await benefitsApi.redeem(selected.program.card.id, key.current);
      if (selected.kind === "subscribe")
        await benefitsApi.subscribe(selected.plan.id);
      if (selected.kind === "cancel")
        await benefitsApi.cancel(selected.membership.id);
      setSuccess(t(`success.${selected.kind}`));
      setSelected(null);
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
    mutation: { selected, pending, error, success },
    actions: { select, close, confirm, clearSuccess: () => setSuccess(null) },
  };
};
