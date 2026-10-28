import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { benefitsApi } from "@/modules/benefits/benefitsApi";
import type {
  BenefitsCatalog,
  BenefitsCatalogState,
} from "@/modules/benefits/types";

// COMPOSABLE
export const useBenefitsCatalog = (
  initialBusiness = "",
): BenefitsCatalogState => {
  const realtimeRevision = useRealtimeRevision(["benefits","loyalty","promotions"]);
  // STATE
  const { t } = useTranslation("benefits");
  const [data, setData] = useState<BenefitsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [businessId, setBusinessId] = useState(initialBusiness);
  const [revision, setRevision] = useState(0);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = setTimeout(
      () => {
        benefitsApi
          .catalog(search, businessId, controller.signal)
          .then((result) => {
            if (!controller.signal.aborted) setData(result);
          })
          .catch(() => {
            if (!controller.signal.aborted) setError(t("loadError"));
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      search ? 220 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, businessId, revision, t, realtimeRevision]);
  // RETURN
  return {
    catalog: {
      data,
      loading,
      error,
      refresh: () => setRevision((value) => value + 1),
    },
    filters: { search, setSearch, businessId, setBusinessId },
  };
};
