import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { commerceService } from "@/modules/commerce/commerceService";
import type {
  CommerceContext,
  CommerceContextState,
  CommerceError,
} from "@/modules/commerce/types";

// COMPOSABLE
export const useCommerceContext = (): CommerceContextState => {
  // STATE
  const [data, setData] = useState<CommerceContext | null>(null);
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    commerceService
      .context(businessId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            isAxiosError<CommerceError>(failure)
              ? failure.response?.data.message ||
                  "No se pudo cargar el catálogo."
              : "No se pudo cargar el catálogo.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, revision]);
  // PUBLIC API
  return {
    listing: { data, loading, error, refresh },
    selection: { businessId, setBusinessId },
  };
};
