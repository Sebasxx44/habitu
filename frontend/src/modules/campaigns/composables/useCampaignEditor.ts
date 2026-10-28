import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { campaignApi, campaignError } from "@/modules/campaigns/campaignApi";
import {
  campaignDraftFrom,
  campaignValidation,
  canEditCampaign,
  emptyCampaign,
} from "@/modules/campaigns/campaignDomain";
import type {
  CampaignDraft,
  CampaignEditorState,
  CampaignOptions,
} from "@/modules/campaigns/types";

// COMPOSABLE
export const useCampaignEditor = (id?: string): CampaignEditorState => {
  // STATE
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState<CampaignDraft>(emptyCampaign);
  const [options, setOptions] = useState<CampaignOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const businessId = Number(params.get("business_id"));
  const promotionId = Number(params.get("promotion_id"));
  const copyId = params.get("copy_from") ?? undefined;
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setOptions(null);
    setError(null);
    setDirty(false);
    Promise.all([
      campaignApi.options(controller.signal),
      id || copyId
        ? campaignApi.get(id ?? copyId ?? "", controller.signal)
        : Promise.resolve(null),
    ])
      .then(([configuration, record]) => {
        if (controller.signal.aborted) return;
        if (id && record && !canEditCampaign(record)) {
          navigate(`/admin/campaigns/${record.id}`, { replace: true });
          return;
        }
        setOptions(configuration);
        const promotion = configuration.promotions.find(
          (item) => item.id === promotionId,
        );
        const selectedBusiness =
          configuration.businesses.find((item) => item.id === businessId)?.id ??
          promotion?.business_id ??
          configuration.businesses[0]?.id ??
          0;
        setForm(
          record
            ? {
                ...campaignDraftFrom(record),
                subject:
                  !id && copyId
                    ? `${record.subject.slice(0, 247)} (copia)`
                    : record.subject,
              }
            : {
                ...emptyCampaign(),
                business_id: selectedBusiness,
                promotion_id:
                  promotion?.business_id === selectedBusiness
                    ? promotion.id
                    : null,
              },
        );
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted)
          setError(campaignError(reason, "No se pudo abrir el editor."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, copyId, businessId, promotionId, revision, navigate]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // ACTIONS
  const update = (value: Partial<CampaignDraft>): void => {
    setForm((current) => ({ ...current, ...value }));
    setDirty(true);
    setError(null);
  };
  const save = async (): Promise<void> => {
    if (inFlight.current) return;
    const validation = campaignValidation(form);
    if (validation) {
      setError(validation);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const record = await campaignApi.save(id, {
        ...form,
        subject: form.subject.trim(),
      });
      setDirty(false);
      navigate(`/admin/campaigns/${record.id}`);
    } catch (reason) {
      setError(
        campaignError(
          reason instanceof Error ? reason : {},
          "No se pudo guardar la campaña.",
        ),
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };
  // RETURN
  return {
    editor: {
      form,
      options,
      loading,
      saving,
      error,
      editing: Boolean(id),
      dirty,
    },
    actions: {
      update,
      segment: (value) => {
        setForm((current) => ({
          ...current,
          segment: { ...current.segment, ...value },
        }));
        setDirty(true);
        setError(null);
      },
      save,
      retry: () => setRevision((value) => value + 1),
    },
  };
};
