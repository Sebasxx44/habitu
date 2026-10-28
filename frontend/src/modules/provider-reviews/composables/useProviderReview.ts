import { useCallback, useEffect, useState } from "react";
import { providerReviewService } from "@/modules/provider-reviews/service";
import type {
  ProviderReviewDetail,
  ProviderReviewState,
  ReviewSubject,
} from "@/modules/provider-reviews/types";

// COMPOSABLE
export const useProviderReview = (): ProviderReviewState => {
  // STATE
  const [subjects, setSubjects] = useState<ReviewSubject[]>([]);
  const [key, select] = useState("");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<ProviderReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // COMPUTED
  const subject = subjects.find((item) => `${item.kind}:${item.id}` === key);
  // ACTIONS
  const search = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const rows = await providerReviewService.subjects(query);
      setSubjects(rows);
      select((previous) =>
        rows.some((row) => `${row.kind}:${row.id}` === previous)
          ? previous
          : rows[0]
            ? `${rows[0].kind}:${rows[0].id}`
            : "",
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);
  const reload = useCallback(async () => {
    if (!subject) return;
    setError(false);
    try {
      setDetail(await providerReviewService.detail(subject));
    } catch {
      setError(true);
    }
  }, [subject]);
  // LIFECYCLE
  useEffect(() => {
    void providerReviewService
      .subjects("")
      .then((rows) => {
        setSubjects(rows);
        if (rows[0]) select(`${rows[0].kind}:${rows[0].id}`);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setDetail(null);
    if (!subject) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void providerReviewService
      .detail(subject, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [subject]);
  // RETURN
  return {
    data: { subjects, detail, loading, error },
    selection: { key, select, query, setQuery },
    actions: { search, reload },
  };
};
