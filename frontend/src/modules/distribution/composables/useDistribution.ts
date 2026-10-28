import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { distributionService } from "@/modules/distribution/distributionService";
import type {
  DistributionContext,
  DistributionState,
  LinkForm,
} from "@/modules/distribution/types";

// CONSTANTS
const emptyForm: LinkForm = {
  label: "",
  service_id: "",
  resource_id: "",
  branch_id: "",
  professional_id: "",
  promo_code: "",
};
// COMPOSABLE
export const useDistribution = (): DistributionState => {
  const { t } = useTranslation("distribution");
  const [data, setData] = useState<DistributionContext | null>(null);
  const [businessId, selectBusiness] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    void distributionService
      .context(businessId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, revision, t]);
  // ACTIONS
  const refresh = () => setRevision((value) => value + 1);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMutationError("");
    try {
      await action();
      refresh();
    } catch {
      setMutationError(t("saveError"));
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (data)
      await run(async () => {
        await distributionService.create(data.business_id, form);
      });
  };
  return {
    listing: { data, businessId, selectBusiness, loading, error, refresh },
    editor: {
      form,
      busy,
      error: mutationError,
      setField: (key, value) =>
        setForm((current) => ({ ...current, [key]: value })),
      create,
      remove: async (id) => {
        await run(async () => {
          await distributionService.remove(id);
        });
      },
    },
  };
};
