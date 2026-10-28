import { httpService } from "@/services/auth/authService";
import type { ReportExportJob, ReportFilters } from "@/modules/reports/types";

// SERVICE
export const reportExportsService = {
  list: async (): Promise<ReportExportJob[]> => {
    const result = await httpService.get<{ data: ReportExportJob[] }>(
      "/reports/exports",
    );
    return result.data;
  },
  create: async (
    filters: ReportFilters,
    currency: string,
  ): Promise<ReportExportJob> => {
    const payload: Record<string, string> = {
      start_date: filters.start,
      end_date: filters.end,
      currency,
    };
    for (const key of [
      "search",
      "status",
      "professional",
      "service",
      "payment",
    ] as const) {
      if (filters[key]) payload[key] = filters[key];
    }
    const result = await httpService.post<{ data: ReportExportJob }>(
      "/reports/exports",
      payload,
    );
    return result.data;
  },
  download: async (job: ReportExportJob): Promise<void> => {
    const result = await httpService.post<{ url: string }>(
      `/reports/exports/${job.id}/download-link`,
    );
    const url = new URL(result.url, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      !url.pathname.startsWith("/api/reports/exports/")
    ) {
      throw new Error("La dirección de descarga no es válida.");
    }
    const anchor = document.createElement("a");
    anchor.href = url.href;
    anchor.download = `reporte-${job.filters.start_date}-${job.filters.end_date}.csv`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  },
};
