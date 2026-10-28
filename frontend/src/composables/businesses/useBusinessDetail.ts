import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { t } from 'i18next'
import { useEffect, useRef, useState } from "react";
import { publicBusinessService } from "@/services/business/publicBusinessService";
import type {
  BusinessDetailState,
  BusinessProfile,
} from "@/modules/businesses/types";

// COMPOSABLE
export const useBusinessDetail = (id: number): BusinessDetailState => {
  const realtimeRevision = useRealtimeRevision(["businesses","branches","services","professionals","reviews","promotions"]);
  // STATE
  const [data, setData] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const loadedId = useRef<number | null>(null);

  // EFFECTS
  useEffect(() => {
    let active = true;
    const initialLoad = loadedId.current !== id;
    setLoading(initialLoad);
    setError(null);
    if (initialLoad) { loadedId.current = null; setData(null); }
    if (!Number.isSafeInteger(id) || id < 1) {
      setError(t('business.invalid'));
      setLoading(false);
      return;
    }
    publicBusinessService
      .getById(id)
      .then((profile) => {
        if (active) { loadedId.current = id; setData(profile); }
      })
      .catch(() => {
        if (active && initialLoad)
          setError(
            t('business.loadError'),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision, realtimeRevision]);

  return {
    profile: { data: data?.id === id ? data : null, loading, error },
    actions: { reload: () => setRevision((value) => value + 1) },
  };
};
