import { initialDateRange } from "@/modules/analytics/dateRange";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import { branchService } from "@/modules/branches/branchService";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";
import type {
  BranchDirectoryState,
  BranchPage,
} from "@/modules/branches/types";

// COMPOSABLE
export const useBranchDirectory = (
  businessId: number | null | undefined,
): BranchDirectoryState => {
  // STATE
  const [data, setData] = useState<BranchPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [range, setRange] = useState<DateRangeValue>(() => initialDateRange("30"));
  const [currency, setCurrency] = useState("COP");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const resolvedKey = useRef<string | null>(null);

  // ACTIONS
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useRealtimeRefresh(
    ["branches", "appointments", "services", "businesses"],
    refresh,
    { enabled: !!businessId, fallbackMs: 60000 },
  );

  // EFFECTS
  useEffect(() => {
    setPage(1);
  }, [search, active, businessId]);
  useEffect(() => {
    const abort = new AbortController();
    if (!businessId) {
      setData(null);
      setError("No tienes un negocio asignado.");
      setLoading(false);
      return;
    }
    const requestKey = JSON.stringify({
      businessId,
      search,
      active,
      range,
      currency,
      page,
    });
    if (resolvedKey.current !== requestKey) setLoading(true);
    setError(null);
    const timer = setTimeout(
      () => {
        branchService
          .list(
            businessId,
            { search, active, start_date: range.start, end_date: range.end, currency, page },
            abort.signal,
          )
          .then((response) => {
            if (!abort.signal.aborted) {
              if (page > response.data.last_page)
                setPage(response.data.last_page);
              else {
                resolvedKey.current = requestKey;
                setData(response.data);
              }
            }
          })
          .catch(() => {
            if (!abort.signal.aborted)
              setError(
                "No se pudieron cargar las sucursales. Inténtalo de nuevo.",
              );
          })
          .finally(() => {
            if (!abort.signal.aborted) setLoading(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [businessId, search, active, range, currency, page, revision]);

  // RETURN
  return {
    directory: {
      items: data?.data ?? [],
      analytics: data?.analytics ?? [],
      summary: data?.summary ?? null,
      loading,
      error,
      total: data?.total ?? 0,
      lastPage: data?.last_page ?? 1,
      refresh,
    },
    filters: {
      search,
      setSearch,
      active,
      setActive,
      range,
      setRange,
      currency,
      setCurrency,
      page,
      setPage,
    },
  };
};
