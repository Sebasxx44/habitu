import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import { useState } from "react";
import { Download, RefreshCw, ChartNoAxesCombined } from "lucide-react";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { statusLabels } from "@/modules/dashboard/formatters";
import { useReports } from "@/modules/reports/composables/useReports";
import { ReportExportsTA } from "@/modules/reports/components/ReportExportsTA";
import { ReportInsightsTA } from "@/modules/reports/components/ReportInsightsTA";
import {
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
} from "@/modules/reports/exports";

// COMPONENT
export const ReportsPage = () => {
  // STATE
  const { report, filters, records, actions } = useReports();
  const { user, permissions } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const data = report.data;
  const currencies = [...new Set([filters.values.currency || data?.currency || "COP", ...(data?.currencies ?? [])])];
  const canExport =
    user?.role === "SUPERADMIN" || permissions.includes("reports.export");
  const money = (value: number): string =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: data?.currency ?? "COP",
    }).format(value);

  // ACTIONS
  const exportFile = async (format: "csv" | "excel" | "pdf") => {
    if (!data || exporting || !canExport) return;
    setExporting(true);
    setExportError("");
    try {
      if (format === "csv") exportReportCsv(data, records.filtered);
      if (format === "excel") await exportReportExcel(data, records.filtered);
      if (format === "pdf") await exportReportPdf(data, records.filtered);
    } catch {
      setExportError("No se pudo generar el archivo. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };
  const selectClass =
    "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-primary";

  return (
    <div className="page-enter mx-auto max-w-[1500px] space-y-6 pb-6">
      <ActionHeaderTA
        icon={ChartNoAxesCombined}
        eyebrow="Inteligencia del negocio"
        title="Cada cita cuenta."
        description="Consulta tu actividad, entiende los resultados y exporta los registros que necesitas."
        actions={
          <ButtonTA
            variant="outline"
            disabled={report.loading}
            onClick={actions.reload}
          >
            <RefreshCw className="size-4" /> Actualizar
          </ButtonTA>
        }
      />
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <DateRangeFilterTA value={filters.range} onChange={filters.setRange} />
        {!data && <label className="space-y-1 text-xs font-medium">Moneda<InputTA aria-label="Moneda del reporte" maxLength={3} value={filters.values.currency || "COP"} onChange={(event) => filters.update("currency", event.target.value.toUpperCase())} /></label>}
        {data && currencies.length > 1 && (
          <label className="space-y-1 text-xs font-medium">
            Moneda
            <select
              className={selectClass}
              value={filters.values.currency || data.currency}
              onChange={(event) =>
                filters.update("currency", event.target.value)
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
        )}
        <p className="pb-2 text-xs text-muted-foreground">
          Hasta 366 días · {data?.shop?.name ?? "Negocios autorizados"}
          {data ? ` · ${data.currency}` : ""}
        </p>
      </div>
      {canExport && <ReportExportsTA disabled={report.loading} filters={filters.values} currency={filters.values.currency || data?.currency || "COP"} />}
      {report.loading ? (
        <DashboardSkeletonTA />
      ) : report.error ? (
        <StateTA
          error
          title="Reporte no disponible"
          description={report.error}
          onRetry={actions.reload}
        />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Valor de servicios realizados",
                  value: money(data.summary.totalRevenue),
                  note: "Citas completadas; no equivale a cobros.",
                },
                {
                  label: "Citas del período",
                  value: data.summary.totalAppointments.toLocaleString("es-CO"),
                  note: `${data.summary.completedAppointments} completadas · ${data.summary.completionRate}%`,
                },
                {
                  label: "Clientes del período",
                  value: data.summary.totalClients.toLocaleString("es-CO"),
                  note: `${data.summary.newClients} nuevos · ${data.summary.returningClients} recurrentes`,
                },
                {
                  label: "Valor promedio por servicio",
                  value: money(data.summary.avgTicket),
                  note: `${data.summary.noShowRate}% de citas sin asistencia`,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-4 break-words text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {metric.note}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="xl:col-span-2">
              <InteractiveChartTA title="Valor realizado por día" description={`Servicios completados, expresados en ${data.currency}.`} currency={data.currency} initialType="area"
                data={data.dailyTrend.map((day) => ({ label: day.date, values: { revenue: day.revenue } }))}
                series={[{ key: "revenue", label: "Valor realizado", format: "currency" }]}
                labelFormatter={(label) => new Date(`${label}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} />
              </div>
              <InteractiveChartTA title="Servicios más solicitados" description="Distribución de citas del período para los servicios del reporte." initialType="bar" allowedTypes={["bar", "pie", "table"]}
                data={data.topServices.map((service) => ({ label: service.name, values: { count: service.count } }))}
                series={[{ key: "count", label: "Citas" }]} />
              <InteractiveChartTA title="Valor realizado por servicio" description={`Importe de los servicios completados del período en ${data.currency}.`} currency={data.currency} initialType="bar" allowedTypes={["bar", "pie", "table"]}
                data={data.topServices.map((service) => ({ label: service.name, values: { revenue: service.revenue } }))}
                series={[{ key: "revenue", label: "Valor realizado", format: "currency" }]} />
            </div>
            <ReportInsightsTA report={data} />
            <PanelTA
              title="Detalle de actividad"
              description="Las exportaciones respetan todos los filtros de esta tabla. Las comisiones y ganancias requieren un registro contable, por eso no se estiman."
              action={
                canExport && (
                  <div className="flex flex-wrap gap-2">
                    {(["csv", "excel", "pdf"] as const).map((format) => (
                      <ButtonTA
                        key={format}
                        variant="outline"
                        disabled={exporting || !records.filtered.length}
                        onClick={() => void exportFile(format)}
                      >
                        <Download className="size-4" /> {format.toUpperCase()}
                      </ButtonTA>
                    ))}
                  </div>
                )
              }
            >
              <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-5">
                <InputTA
                  aria-label="Buscar cliente, profesional o servicio"
                  placeholder="Buscar en el reporte…"
                  value={filters.values.search}
                  onChange={(event) =>
                    filters.update("search", event.target.value)
                  }
                />
                <select
                  className={selectClass}
                  aria-label="Estado"
                  value={filters.values.status}
                  onChange={(event) =>
                    filters.update("status", event.target.value)
                  }
                >
                  <option value="">Todos los estados</option>
                  {data.statusDistribution.map((item) => (
                    <option value={item.status} key={item.status}>
                      {statusLabels[item.status] ?? item.status}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  aria-label="Profesional"
                  value={filters.values.professional}
                  onChange={(event) =>
                    filters.update("professional", event.target.value)
                  }
                >
                  <option value="">Todos los profesionales</option>
                  {[
                    ...new Set(data.records.map((record) => record.barbero)),
                  ].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  aria-label="Servicio"
                  value={filters.values.service}
                  onChange={(event) =>
                    filters.update("service", event.target.value)
                  }
                >
                  <option value="">Todos los servicios</option>
                  {data.topServices.map((service) => (
                    <option key={service.name}>{service.name}</option>
                  ))}
                </select>
                <select
                  className={selectClass}
                  aria-label="Método de pago"
                  value={filters.values.payment}
                  onChange={(event) =>
                    filters.update("payment", event.target.value)
                  }
                >
                  <option value="">Todos los métodos</option>
                  {[
                    ...new Set(
                      data.records.map((record) => record.metodo_pago),
                    ),
                  ].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
              {exportError && (
                <p role="alert" className="px-5 pb-4 text-sm text-destructive">
                  {exportError}
                </p>
              )}
              {!records.filtered.length ? (
                <StateTA
                  title="No hay citas con estos filtros"
                  description="Ajusta la búsqueda, los filtros o el período para ver más actividad."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-sm">
                    <thead className="border-y border-border bg-muted/50 text-xs text-muted-foreground">
                      <tr>
                        {[
                          "Fecha",
                          "Cliente",
                          "Servicio / profesional",
                          "Estado",
                          `Valor final (${data.currency})`,
                          "Pagos registrados",
                        ].map((heading) => (
                          <th
                            className="px-5 py-3 font-medium"
                            key={heading}
                            scope="col"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {records.visible.map((record) => (
                        <tr key={record.id} className="hover:bg-muted/30">
                          <td className="px-5 py-4">
                            {record.fecha}
                            <span className="block text-xs text-muted-foreground">
                              {record.hora} · {record.sucursal}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-medium">
                            {record.cliente}
                          </td>
                          <td className="px-5 py-4">
                            {record.servicio}
                            <span className="block text-xs text-muted-foreground">
                              {record.barbero}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {statusLabels[record.estado] ?? record.estado}
                          </td>
                          <td className="px-5 py-4 font-semibold">
                            {money(record.valor_final)}
                          </td>
                          <td className="px-5 py-4">
                            {money(record.total_pagado)}
                            <span className="block text-xs text-muted-foreground">
                              {record.metodo_pago}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
                <p className="text-xs text-muted-foreground">
                  {records.filtered.length} citas · Página {records.page} de{" "}
                  {records.pages}
                </p>
                <div className="flex gap-2">
                  <ButtonTA
                    variant="outline"
                    disabled={records.page === 1}
                    onClick={() => records.setPage(records.page - 1)}
                  >
                    Anterior
                  </ButtonTA>
                  <ButtonTA
                    variant="outline"
                    disabled={records.page === records.pages}
                    onClick={() => records.setPage(records.page + 1)}
                  >
                    Siguiente
                  </ButtonTA>
                </div>
              </div>
            </PanelTA>
          </>
        )
      )}
    </div>
  );
};
