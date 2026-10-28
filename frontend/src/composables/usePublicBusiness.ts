import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type { Business } from "@/types/models";

export const usePublicBusiness = (slug: string | undefined) => {
  const realtimeRevision = useRealtimeRevision(["businesses","branches","services","professionals","reviews"]);
  // State
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Lifecycle
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void httpService
      .get<{ data: Business }>(
        `/v2/businesses/slug/${encodeURIComponent(slug ?? "")}`,
        { signal: controller.signal },
      )
      .then((result) => {
        if (!controller.signal.aborted) setBusiness(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "No pudimos encontrar este negocio o cargar su información.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, attempt, realtimeRevision]);

  return {
    business,
    loading,
    error,
    refresh: () => setAttempt((current) => current + 1),
  };
};
