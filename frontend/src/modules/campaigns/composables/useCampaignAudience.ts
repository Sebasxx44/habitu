import { useEffect, useState } from "react";
import { campaignApi, campaignError } from "@/modules/campaigns/campaignApi";
import type {
  CampaignAudience,
  CampaignAudienceState,
  CampaignDraft,
} from "@/modules/campaigns/types";

// COMPOSABLE
export const useCampaignAudience = (
  form: CampaignDraft,
  enabled = true,
): CampaignAudienceState => {
  // STATE
  const [data, setData] = useState<CampaignAudience | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({
    business_id: form.business_id,
    target_role: form.target_role,
    target_ids: form.target_ids,
    segment: form.segment,
  });
  // EFFECTS
  useEffect(() => {
    if (!enabled || !form.business_id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError(null);
    const timer = window.setTimeout(() => {
      campaignApi
        .audience(form, controller.signal)
        .then((value) => {
          if (!controller.signal.aborted) setData(value);
        })
        .catch((reason: Error) => {
          if (!controller.signal.aborted)
            setError(
              campaignError(reason, "No se pudo calcular la audiencia."),
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, enabled]);
  // RETURN
  return { data, loading, error };
};
