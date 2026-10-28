import {
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useReportExports } from "@/modules/reports/composables/useReportExports";
import type { ReportFilters } from "@/modules/reports/types";

// TYPES
interface ReportExportsProps {
  filters: ReportFilters;
  currency: string;
  disabled?: boolean;
}

// COMPONENT
export const ReportExportsTA = ({ filters, currency, disabled = false }: ReportExportsProps) => {
  // COMPOSABLES
  const { queue, actions } = useReportExports(filters, currency);
  const active = queue.jobs.filter(
    (job) => job.status === "queued" || job.status === "processing",
  ).length;
  const days = (Date.parse(filters.end) - Date.parse(filters.start)) / 86400000;
  const valid =
    Number.isFinite(days) &&
    days >= 0 &&
    days <= 365 &&
    /^[A-Z]{3}$/.test(currency);
  const labels = {
    queued: "En cola",
    processing: "Preparando archivo",
    completed: "Listo para descargar",
    failed: "No se pudo completar",
  };

  return (
    <PanelTA
      title="Exportaciones en segundo plano"
      description="Descarga hasta 1.000.000 de citas en CSV, compatible con Excel. Se aplican el período, moneda y filtros seleccionados; el archivo estará disponible durante 24 horas."
      action={
        <ButtonTA
          disabled={disabled || queue.submitting || active >= 3 || !valid}
          onClick={() => void actions.create()}
        >
          {queue.submitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          {queue.submitting ? "Solicitando…" : "Generar CSV masivo"}
        </ButtonTA>
      }
    >
      <div className="space-y-3 px-5 pb-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {active
              ? `${active} de 3 exportaciones activas · Puedes continuar trabajando`
              : `Período seleccionado · ${currency}`}
          </span>
          <ButtonTA
            variant="ghost"
            disabled={queue.loading}
            onClick={() => void actions.refresh()}
            aria-label="Actualizar exportaciones"
          >
            <RefreshCw className="size-4" />
            Actualizar estado
          </ButtonTA>
        </div>
        {queue.error && (
          <p role="alert" className="text-sm text-destructive">
            {queue.error}
          </p>
        )}
        {queue.loading && (
          <p className="text-sm text-muted-foreground" role="status">
            Consultando tus exportaciones…
          </p>
        )}
        {!queue.loading && !queue.jobs.length && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Tus archivos aparecerán aquí. No necesitas mantener esta página
            abierta mientras se generan.
          </div>
        )}
        <div className="divide-y divide-border" aria-live="polite">
          {queue.jobs.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                {job.status === "completed" ? (
                  <CheckCircle2 className="size-5" />
                ) : job.status === "processing" ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <Clock3 className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {job.filters.start_date} → {job.filters.end_date} ·{" "}
                  {job.filters.currency}
                </p>
                <p
                  className={`mt-1 text-xs ${job.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {labels[job.status]} ·{" "}
                  {job.rows_processed.toLocaleString("es-CO")} filas
                  {job.attempts > 1 ? ` · Intento ${job.attempts}/3` : ""}
                </p>
                {job.error && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {job.error}
                  </p>
                )}
              </div>
              {job.status === "completed" && (
                <ButtonTA
                  variant="outline"
                  disabled={queue.downloading !== null}
                  onClick={() => void actions.download(job)}
                >
                  <Download className="size-4" />
                  {queue.downloading === job.id ? "Descargando…" : "Descargar"}
                </ButtonTA>
              )}
            </div>
          ))}
        </div>
      </div>
    </PanelTA>
  );
};
