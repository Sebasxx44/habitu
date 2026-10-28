import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { operationsService } from "@/modules/operations/services/operationsService";
import type {
  OperationsContext,
  OperationsContextResult,
} from "@/modules/operations/types";

// COMPOSABLE
export const useOperationsContext = (): OperationsContextResult => {
  // SERVICES
  const { t } = useTranslation("operations");
  const [params] = useSearchParams();
  // STATE
  const [businessId, setBusinessId] = useState(params.get("business_id") ?? "");
  const [data, setData] = useState<OperationsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void operationsService
      .context(businessId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(t("loadError"));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, revision, t]);
  // EXPOSE
  return {
    data,
    request: {
      loading,
      error,
      reload: () => setRevision((current) => current + 1),
    },
    selection: { businessId, setBusinessId },
  };
};
