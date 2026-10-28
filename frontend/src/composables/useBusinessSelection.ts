import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { businessService } from "@/services/business/businessService";
import type { Business } from "@/types/models";
import type { BusinessSelectionState } from "@/composables/business/types";

// COMPOSABLE
export const useBusinessSelection = (
  initialId?: number | null,
): BusinessSelectionState => {
  const realtimeRevision = useRealtimeRevision(["businesses"]);
  // STATE
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, selectBusiness] = useState(String(initialId || ""));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // EFFECTS
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(
      () => {
        businessService
          .getAll({ search: search || undefined })
          .then((data) => {
            if (active) setBusinesses(data.businesses);
          })
          .catch(() => {
            if (active) setError("No se pudieron cargar los negocios.");
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, revision, realtimeRevision]);

  // RETURN
  return {
    businesses,
    businessId,
    selectBusiness,
    search,
    setSearch,
    loading,
    error,
    reload: () => setRevision((value) => value + 1),
  };
};
