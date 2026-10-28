import { isAxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";
import { reportExportsService } from "@/modules/reports/services/reportExportsService";
import type {
  ReportExportJob,
  ReportExportsState,
  ReportFilters,
} from "@/modules/reports/types";

// COMPOSABLE
export const useReportExports = (
  filters: ReportFilters,
  currency: string,
): ReportExportsState => {
  // STATE
  const [jobs, setJobs] = useState<ReportExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const creating = useRef(false);

  // ACTIONS
  const refresh = useCallback(async (): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = await reportExportsService.list();
      if (mounted.current) {
        setJobs(result);
        setError(null);
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          isAxiosError<{ message?: string }>(failure) &&
            failure.response?.data.message
            ? failure.response.data.message
            : failure instanceof Error
              ? failure.message
              : "No se pudo consultar la cola.",
        );
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  const create = async (): Promise<void> => {
    if (creating.current) return;
    creating.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const job = await reportExportsService.create(filters, currency);
      if (mounted.current)
        setJobs((current) =>
          [job, ...current.filter((item) => item.id !== job.id)].slice(0, 20),
        );
    } catch (failure) {
      if (mounted.current)
        setError(
          isAxiosError<{ message?: string }>(failure) &&
            failure.response?.data.message
            ? failure.response.data.message
            : failure instanceof Error
              ? failure.message
              : "No se pudo solicitar la exportación.",
        );
    } finally {
      creating.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };
  const download = async (job: ReportExportJob): Promise<void> => {
    if (downloading) return;
    setDownloading(job.id);
    setError(null);
    try {
      await reportExportsService.download(job);
    } catch (failure) {
      if (mounted.current)
        setError(
          isAxiosError<{ message?: string }>(failure) &&
            failure.response?.data.message
            ? failure.response.data.message
            : failure instanceof Error
              ? failure.message
              : "No se pudo descargar el reporte.",
        );
    } finally {
      if (mounted.current) setDownloading(null);
    }
  };

  // EFFECTS
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  useRealtimeRefresh(["reports"], refresh, { fallbackMs: 60000 });
  const hasActiveJobs = jobs.some(
    (job) => job.status === "queued" || job.status === "processing",
  );
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [hasActiveJobs, refresh]);

  // RETURN
  return {
    queue: { jobs, loading, submitting, downloading, error },
    actions: { create, refresh, download },
  };
};
