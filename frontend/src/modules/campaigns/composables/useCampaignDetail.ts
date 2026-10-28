import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { campaignApi, campaignError } from "@/modules/campaigns/campaignApi";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import type {
  CampaignAnalytics,
  CampaignDetailState,
  CampaignOptions,
  CampaignRecord,
} from "@/modules/campaigns/types";

// COMPOSABLE
export const useCampaignDetail = (id: string): CampaignDetailState => {
  // STATE
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [stats, setStats] = useState<CampaignAnalytics | null>(null);
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<"send" | "delete" | null>(
    null,
  );
  const [operationError, setOperationError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const live = useRealtimeRevision(["promotions", "campaigns"]);
  // EFFECTS
  useEffect(() => {
    setConfirmation(null);
    setOperationError(null);
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      campaignApi.get(id, controller.signal),
      campaignApi.stats(id, controller.signal),
      campaignApi.options(controller.signal),
    ])
      .then(([record, analytics, configuration]) => {
        if (!controller.signal.aborted) {
          setCampaign(record);
          setStats(analytics);
          setOptions(configuration);
        }
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted)
          setError(campaignError(reason, "No se pudo cargar la campaña."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision, live]);
  useEffect(() => {
    if (!campaign || !["PENDING", "PROCESSING"].includes(campaign.status))
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setRevision((value) => value + 1);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [campaign?.status]);
  // ACTIONS
  const execute = async (): Promise<void> => {
    if (
      !campaign ||
      campaign.id !== Number(id) ||
      loading ||
      busy ||
      !confirmation
    )
      return;
    setBusy(true);
    setOperationError(null);
    try {
      if (confirmation === "delete") {
        await campaignApi.remove(campaign.id);
        navigate("/admin/campaigns");
      } else {
        const result = await campaignApi.send(campaign.id);
        setCampaign(result.campaign);
        setRevision((value) => value + 1);
      }
      setConfirmation(null);
    } catch (reason) {
      setOperationError(
        campaignError(
          reason instanceof Error ? reason : {},
          "No se pudo completar la operación.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  // RETURN
  return {
    detail: {
      campaign: campaign?.id === Number(id) ? campaign : null,
      stats: campaign?.id === Number(id) ? stats : null,
      options,
      loading,
      error,
      refresh: () => setRevision((value) => value + 1),
    },
    operation: {
      busy,
      confirmation,
      error: operationError,
      confirm: (value) => {
        setConfirmation(value);
        setOperationError(null);
      },
      execute,
    },
  };
};
