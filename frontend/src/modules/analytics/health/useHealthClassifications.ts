import { useEffect, useRef, useState, type FormEvent } from "react";
import { healthService } from "@/modules/analytics/health/healthService";
import type {
  AnalyticsEnvironment,
  ClassificationResult,
  HealthBusiness,
} from "@/modules/analytics/health/types";

// COMPOSABLE
export const useHealthClassifications = (
  refresh: () => void,
): ClassificationResult => {
  // STATE
  const [businesses, setBusinesses] = useState<HealthBusiness[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [id, setId] = useState(0);
  const [environment, setEnvironment] =
    useState<AnalyticsEnvironment>("UNCLASSIFIED");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  // LIFECYCLE
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = window.setTimeout(
      () => {
        void healthService
          .businesses(search, page, controller.signal)
          .then((result) => {
            if (!controller.signal.aborted) {
              setBusinesses(result.data);
              setLastPage(result.last_page);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) setError(true);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [search, page, revision]);
  // ACTIONS
  const select = (next: number) => {
    setId(next);
    setEnvironment(
      businesses.find((item) => item.id === next)?.analytics_environment ??
        "UNCLASSIFIED",
    );
    setReason("");
    setSaved(false);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !id) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await healthService.classify(id, environment, reason);
      setSaved(true);
      setRevision((current) => current + 1);
      refresh();
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    list: {
      businesses,
      search,
      setSearch: (next) => {
        setSearch(next);
        setPage(1);
        setId(0);
      },
      page,
      lastPage,
      setPage,
    },
    form: {
      id,
      environment,
      reason,
      select,
      setEnvironment,
      setReason,
      submit,
    },
    request: { loading, busy, error, saved },
  };
};
