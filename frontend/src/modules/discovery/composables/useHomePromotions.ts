import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { t } from 'i18next'
import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type {
  HomePromotionBusiness,
  HomePromotionResponse,
  HomePromotionsState,
} from "@/modules/discovery/homePromotionTypes";

// COMPOSABLE
export const useHomePromotions = (): HomePromotionsState => {
  const realtimeRevision = useRealtimeRevision(["promotions","businesses"]);
  // STATE
  const [items, setItems] = useState<HomePromotionBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    httpService
      .get<HomePromotionResponse>("/v2/businesses/search", {
        params: { per_page: 3, promotions: 1, sort: "newest" },
        signal: controller.signal,
      })
      .then((response) => {
        if (controller.signal.aborted) return;
        setItems(
          response.data.data.filter(
            (business) => business.active_promotion !== null,
          ),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(t('homePromotions.loadError'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, realtimeRevision]);

  // ACTIONS
  const retry = () => setRevision((value) => value + 1);

  // RETURN
  return { results: { items, loading, error }, actions: { retry } };
};
