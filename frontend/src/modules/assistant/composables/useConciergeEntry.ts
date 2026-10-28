import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { conciergeIntents } from "@/modules/assistant/config";
import type { AssistantState } from "@/modules/assistant/types";

// COMPOSABLE
export const useConciergeEntry = (
  loading: boolean,
  send: AssistantState["actions"]["send"],
): void => {
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation("marketplace");
  const consumed = useRef(false);
  const intent = conciergeIntents.find(
    (value) => value === params.get("intent"),
  );
  useEffect(() => {
    if (loading || consumed.current || !intent) return;
    consumed.current = true;
    const next = new URLSearchParams(params);
    next.delete("intent");
    setParams(next, { replace: true });
    void send(t(`concierge.${intent}Prompt`));
  }, [loading, intent, params, setParams, send, t]);
};
