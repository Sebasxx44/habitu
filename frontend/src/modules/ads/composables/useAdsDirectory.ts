import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { adsService } from "@/modules/ads/adsService";
import type {
  AdRecord,
  AdsDirectory,
  AdsDirectoryState,
  AdsError,
} from "@/modules/ads/types";

// COMPOSABLE
export const useAdsDirectory = (): AdsDirectoryState => {
  // STATE
  const [data, setData] = useState<AdsDirectory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const running = useRef(false);
  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const run = async (
    id: number,
    action: () => Promise<void>,
  ): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusyId(id);
    setMutationError(null);
    try {
      await action();
      refresh();
    } catch (failure) {
      const response = isAxiosError<AdsError>(failure)
        ? failure.response?.data
        : undefined;
      setMutationError(
        Object.values(response?.errors || {}).flat()[0] ||
          response?.message ||
          "No se pudo actualizar el anuncio.",
      );
    } finally {
      running.current = false;
      setBusyId(null);
    }
  };
  const status = (ad: AdRecord) =>
    run(ad.id, async () => {
      await adsService.status(
        ad.id,
        ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
      );
    });
  const remove = (id: number) =>
    run(id, async () => {
      await adsService.remove(id);
    });
  const moderate = (
    id: number,
    decision: "APPROVED" | "REJECTED",
    reason: string,
  ) =>
    run(id, async () => {
      await adsService.moderate(id, decision, reason);
    });
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    adsService
      .directory(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            isAxiosError<AdsError>(failure)
              ? failure.response?.data.message ||
                  "No se pudieron cargar los anuncios."
              : "No se pudieron cargar los anuncios.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  // PUBLIC API
  return {
    listing: { data, loading, error, refresh },
    mutation: { busyId, error: mutationError },
    actions: { status, remove, moderate },
  };
};
