import { useEffect, useRef, useState, type FormEvent } from "react";
import { healthService } from "@/modules/analytics/health/healthService";
import type {
  HealthFeatureName,
  HealthFeatureScope,
  HealthFeatureState,
  HealthFeaturesResponse,
  HealthFeaturesResult,
} from "@/modules/analytics/health/types";

// COMPOSABLE
export const useHealthFeatureFlags = (
  businessId: number,
): HealthFeaturesResult => {
  // STATE
  const [data, setData] = useState<HealthFeaturesResponse>({
    flags: [],
    categories: [],
  });
  const [flag, setFlag] = useState<HealthFeatureName>("group_coordination");
  const [scope, setScope] = useState<HealthFeatureScope>("global");
  const [categoryId, setCategoryId] = useState(0);
  const [state, setState] = useState<HealthFeatureState>("disabled");
  const [percentage, setPercentage] = useState(100);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  // DERIVED
  const scopeId =
    scope === "business"
      ? businessId
      : scope === "category"
        ? categoryId
        : null;
  const selected = data.flags.find((item) => item.name === flag);
  const available = Boolean(selected && (scope === "global" || scopeId));
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void healthService
      .features(scope, scopeId || null, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [scope, scopeId, revision]);
  useEffect(() => {
    setState(
      scope === "global"
        ? selected?.enabled
          ? "enabled"
          : "disabled"
        : selected?.override === null || selected?.override === undefined
          ? "inherit"
          : selected.override
            ? "enabled"
            : "disabled",
    );
    setPercentage(selected?.user_percentage ?? 100);
    setReason("");
  }, [selected, scope]);
  // ACTIONS
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !available) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await healthService.updateFeature(flag, {
        scope,
        scope_id: scopeId,
        enabled: state === "inherit" ? null : state === "enabled",
        user_percentage: percentage,
        reason,
      });
      setRevision((current) => current + 1);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    selection: {
      flags: data.flags,
      categories: data.categories,
      flag,
      scope,
      categoryId,
      setFlag: (value) => {
        setFlag(value);
        setSaved(false);
      },
      setScope: (value) => {
        setScope(value);
        setSaved(false);
      },
      setCategoryId: (value) => {
        setCategoryId(value);
        setSaved(false);
      },
    },
    form: {
      state,
      percentage,
      reason,
      selected,
      available,
      setState,
      setPercentage,
      setReason,
      submit,
    },
    request: { loading, busy, error, saved },
  };
};
