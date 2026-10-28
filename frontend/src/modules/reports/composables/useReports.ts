import { analyticsToday } from "@/modules/analytics/period";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardService } from "@/services/dashboard/dashboardService";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";
import type {
  DetailedReport,
  ReportFilters,
  ReportsState,
} from "@/modules/reports/types";

// COMPOSABLE
export const useReports = (): ReportsState => {
  // STATE
  const today = analyticsToday();
  const [data, setData] = useState<DetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(1);
  const request = useRef(0);
  const [preset, setPreset] = useState<DateRangeValue["preset"]>("custom");
  const [filters, setFilters] = useState<ReportFilters>({
    start: `${today.slice(0, 7)}-01`,
    end: today,
    currency: "",
    search: "",
    status: "",
    professional: "",
    service: "",
    payment: "",
  });

  // EFFECTS
  useEffect(() => {
    const sequence = ++request.current;
    const load = async () => {
      setLoading(true);
      setError(null);
      const days =
        (Date.parse(filters.end) - Date.parse(filters.start)) / 86400000;
      if (!Number.isFinite(days) || days < 0 || days > 365) {
        setError("Selecciona un período válido de hasta 366 días.");
        setData(null);
        setLoading(false);
        return;
      }
      try {
        const result = await dashboardService.getDetailedReport(
          filters.start,
          filters.end,
          filters.currency || undefined,
        );
        if (request.current === sequence) setData(result);
      } catch (failure) {
        if (request.current === sequence) {
          setData(null);
          setError(
            isAxiosError<{ message?: string }>(failure) && failure.response?.data.message
              ? failure.response.data.message
              : failure instanceof Error
              ? failure.message
              : "No se pudo cargar el reporte.",
          );
        }
      } finally {
        if (request.current === sequence) setLoading(false);
      }
    };
    void load();
    return () => {
      request.current++;
    };
  }, [filters.start, filters.end, filters.currency, version]);

  // DERIVED STATE
  useRealtimeRefresh(["reports", "appointments", "payments"], () => setVersion((current) => current + 1));

  const filtered = useMemo(
    () =>
      (data?.records ?? []).filter(
        (record) =>
          (!filters.search ||
            `${record.cliente} ${record.barbero} ${record.servicio}`
              .toLocaleLowerCase("es")
              .includes(filters.search.toLocaleLowerCase("es"))) &&
          (!filters.status || record.estado === filters.status) &&
          (!filters.professional || record.barbero === filters.professional) &&
          (!filters.service || record.servicio === filters.service) &&
          (!filters.payment || record.metodo_pago === filters.payment),
      ),
    [data, filters],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);

  // ACTIONS
  const update = <Key extends keyof ReportFilters>(
    key: Key,
    value: ReportFilters[Key],
  ) => {
    if ((key === "currency" || key === "start" || key === "end") && filters[key] !== value) setLoading(true);
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return {
    report: { data, loading, error },
    filters: { values: filters, update,
      range: { preset, start: filters.start, end: filters.end },
      setRange: (value) => {
        if (value.start !== filters.start || value.end !== filters.end) setLoading(true);
        setPreset(value.preset);
        setFilters((current) => ({ ...current, start: value.start, end: value.end }));
        setPage(1);
      },
    },
    records: {
      filtered,
      visible: filtered.slice((currentPage - 1) * 20, currentPage * 20),
      page: currentPage,
      pages,
      setPage,
    },
    actions: { reload: () => setVersion((current) => current + 1) },
  };
};
