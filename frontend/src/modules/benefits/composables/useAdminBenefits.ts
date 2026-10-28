import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { adminBenefitsApi } from "@/modules/benefits/adminBenefitsApi";
import type {
  AdminBenefitsData,
  AdminBenefitsState,
} from "@/modules/benefits/adminTypes";

// COMPOSABLE
export const useAdminBenefits = (): AdminBenefitsState => {
  const realtimeRevision = useRealtimeRevision(["benefits","loyalty","promotions"]);
  const { t } = useTranslation("benefits");
  const [searchParams, setSearchParams] = useSearchParams();
  // STATE
  const [data, setData] = useState<AdminBenefitsData | null>(null);
  const [cardsPage, setCardsPage] = useState(1);
  const businessId = searchParams.get("business_id") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    adminBenefitsApi
      .list(businessId, cardsPage, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("admin.noBusiness"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, cardsPage, revision, t, realtimeRevision]);
  // RETURN
  return {
    listing: {
      data: businessId && data && data.business_id !== Number(businessId) ? null : data,
      loading,
      error,
      refresh: () => setRevision((value) => value + 1),
    },
    selection: {
      cardsPage,
      setCardsPage,
      businessId,
      setBusinessId: (value) => {
        setSearchParams((current) => { const next = new URLSearchParams(current); next.set("business_id", value); return next; });
        setCardsPage(1);
      },
    },
  };
};
