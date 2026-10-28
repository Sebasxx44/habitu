import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { payoutService } from "@/modules/payouts/payoutService";
import type {
  PayoutAttempt,
  PayoutContext,
  PayoutWorkspace,
} from "@/modules/payouts/types";

// COMPOSABLE
export const usePayoutWorkspace = (): PayoutWorkspace => {
  const { t } = useTranslation("payouts");
  const [data, setData] = useState<PayoutContext | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void payoutService
      .index(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, t]);
  // ACTIONS
  const refresh = () => setRevision((value) => value + 1);
  const run = async (action: () => Promise<{ data: PayoutAttempt }>) => {
    setBusy(true);
    setMutationError("");
    try {
      await action();
      refresh();
    } catch {
      setMutationError(t("error"));
    } finally {
      setBusy(false);
    }
  };
  return {
    listing: { data, loading, error, refresh },
    actions: {
      busy,
      error: mutationError,
      prepare: (id) => run(() => payoutService.prepare(id)),
      submit: (id) => run(() => payoutService.submit(id)),
      reconcile: (id) => run(() => payoutService.reconcile(id)),
    },
  };
};
