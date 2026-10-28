import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { campaignApi, campaignError } from "@/modules/campaigns/campaignApi";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import type {
  CampaignFilters,
  CampaignListingState,
  CampaignOptions,
  CampaignRecord,
} from "@/modules/campaigns/types";

// COMPOSABLE
export const useCampaignListing = (): CampaignListingState => {
  // STATE
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<CampaignRecord[]>([]);
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const live = useRealtimeRevision(["promotions", "campaigns"]);
  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";
  const businessId = params.get("business_id") ?? "";
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      Promise.all([
        campaignApi.list(
          { q, status, type, business_id: businessId },
          controller.signal,
        ),
        campaignApi.options(controller.signal),
      ])
        .then(([records, configuration]) => {
          if (!controller.signal.aborted) {
            setItems(records);
            setOptions(configuration);
          }
        })
        .catch((reason: Error) => {
          if (!controller.signal.aborted)
            setError(
              campaignError(reason, "No se pudieron cargar las campañas."),
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, status, type, businessId, revision, live]);
  // COMPUTED
  const metrics = useMemo(
    () => ({
      campaigns: items.length,
      drafts: items.filter((item) => item.status === "DRAFT").length,
      sent: items.reduce((total, item) => total + item.sent_count, 0),
      recipients: items.reduce(
        (total, item) => total + item.recipients_count,
        0,
      ),
    }),
    [items],
  );
  // ACTIONS
  const update = (value: Partial<CampaignFilters>): void => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(value).forEach(([key, entry]) => {
          if (entry) next.set(key, entry);
          else next.delete(key);
        });
        return next;
      },
      { replace: true },
    );
  };
  // RETURN
  return {
    listing: {
      items,
      options,
      loading,
      error,
      refresh: () => setRevision((value) => value + 1),
    },
    filters: { values: { q, status, type, business_id: businessId }, update },
    metrics,
  };
};
