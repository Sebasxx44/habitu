import { ArrowUpRight, Lightbulb, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import { StateTA } from "@/components/TA/StateTA";
import { useAnalyticsOverview } from "@/modules/analytics/composables/useAnalyticsOverview";
import { buildGrowthActions } from "@/modules/agenda/growthActions";

// CONSTANTS
const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// COMPONENT
export const BusinessAgendaInsightsTA = ({
  businessId,
}: {
  businessId: number;
}) => {
  const { overview, filters } = useAnalyticsOverview(businessId);
  const data = overview.data;
  const actions = data ? buildGrowthActions(data) : [];
  const counts = data
    ? [
        {
          id: "reservations",
          label: "Reservas",
          description: "Todos los estados del período",
        },
        {
          id: "realizedValue",
          label: `Valor realizado · ${data.currency}`,
          description: "Completadas; no son cobros ni utilidad",
        },
        {
          id: "averageTicket",
          label: `Ticket promedio · ${data.currency}`,
          description: "Promedio de servicios completados",
        },
        {
          id: "uniqueClients",
          label: "Clientes distintos",
          description: "Con reservas no canceladas",
        },
      ].map((item) => ({
        ...item,
        metric: data.metrics.find((metric) => metric.id === item.id),
      }))
    : [];
  return (
    <section
      aria-label="Análisis y oportunidades de la agenda"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4 text-primary" />
            Tu negocio en perspectiva
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Resultados históricos del negocio; independientes de los filtros de
            la agenda.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="agenda-analysis-currency">
            Moneda del análisis
          </label>
          <select
            id="agenda-analysis-currency"
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
            value={filters.value.currency}
            onChange={(event) => filters.update("currency", event.target.value)}
          >
            {Array.from(
              new Set([
                filters.value.currency,
                ...(data?.currencies ?? []),
                "COP",
                "USD",
              ]),
            ).map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
      </div>
      <DateRangeFilterTA value={filters.value} onChange={filters.setRange} />
      {overview.loading ? (
        <div role="status" className="h-24 animate-pulse rounded-2xl bg-muted">
          <span className="sr-only">Cargando indicadores</span>
        </div>
      ) : overview.error ? (
        <StateTA
          error
          title="Análisis no disponible"
          description={overview.error}
          onRetry={overview.refresh}
        />
      ) : (
        data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {counts.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
                    {item.metric?.value == null
                      ? "—"
                      : new Intl.NumberFormat(
                          "es-CO",
                          item.metric.unit === "currency"
                            ? {
                                style: "currency",
                                currency: data.currency,
                                maximumFractionDigits: 0,
                              }
                            : {},
                        ).format(item.metric.value)}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            <details
              className="group rounded-2xl border border-border bg-card"
              open
            >
              <summary className="cursor-pointer p-5 text-sm font-semibold">
                Oportunidades y patrones de reserva{" "}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {data.period.start} — {data.period.end}
                </span>
              </summary>
              <div className="space-y-5 px-4 pb-5 md:px-5">
                <div className="grid gap-3 lg:grid-cols-3">
                  {actions.map((action) => (
                    <article
                      key={action.id}
                      className={`rounded-xl border p-4 ${action.priority === "attention" ? "border-amber-500/25 bg-amber-500/5" : "border-primary/20 bg-primary/5"}`}
                    >
                      <Lightbulb className="mb-3 size-4 text-primary" />
                      <h3 className="text-sm font-semibold">{action.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {action.evidence}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed">
                        {action.action}
                      </p>
                      <Link
                        to={action.to}
                        className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-primary"
                      >
                        {action.label}
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </article>
                  ))}
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <InteractiveChartTA title="Demanda por hora" description="Reservas según hora de inicio; incluye todos los estados. No mide ocupación." initialType="bar" allowedTypes={["bar", "line", "area", "table"]}
                    data={data.hours.map((hour) => ({ label: hour.id, values: { reservations: hour.value } }))}
                    series={[{ key: "reservations", label: "Reservas" }]} />
                  <InteractiveChartTA title="Demanda por día de la semana" description="Patrones de las reservas del período seleccionado." initialType="bar" allowedTypes={["bar", "pie", "table"]}
                    data={days.map((day, index) => ({ label: day, values: { reservations: data.weekdays.find((row) => row.id === String(index))?.value ?? 0 } }))}
                    series={[{ key: "reservations", label: "Reservas" }]} />
                </div>
              </div>
            </details>
          </>
        )
      )}
    </section>
  );
};
