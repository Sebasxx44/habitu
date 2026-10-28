import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { ServiceMetricTA } from "@/modules/services/admin/ServiceMetricTA";
import { useServiceInsights } from "@/modules/services/admin/useServiceInsights";
import { serviceStatusLabel } from "@/modules/services/admin/servicePresentation";
import { formatCurrency, formatDate } from "@/i18n/formatters";

// COMPONENT
export const ServiceInsightsTA = ({ serviceId }: { serviceId: number }) => {
  const { insights, actions } = useServiceInsights(serviceId);
  const navigate = useNavigate();
  const data = insights.data;
  if (insights.loading)
    return (
      <PanelTA title="Rendimiento del servicio">
        <div
          className="grid animate-pulse grid-cols-2 gap-4 p-5"
          role="status"
          aria-label="Cargando estadísticas"
        >
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </PanelTA>
    );
  if (insights.error || !data)
    return (
      <StateTA
        error
        title="Estadísticas no disponibles"
        description={insights.error || "Intenta cargar los datos nuevamente."}
        onRetry={() => void actions.refresh()}
      />
    );
  const maxTrend = Math.max(1, ...data.weeklyTrend.map((item) => item.citas));
  return (
    <section className="space-y-5" aria-label="Rendimiento del servicio">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Rendimiento</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Actividad histórica hasta hoy. Los ingresos corresponden a citas
            completadas.
          </p>
        </div>
        <ButtonTA
          variant="ghost"
          size="icon"
          aria-label="Actualizar estadísticas"
          onClick={() => void actions.refresh()}
        >
          <RefreshCw className="size-4" />
        </ButtonTA>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ServiceMetricTA
          label="Reservas históricas"
          value={data.stats.totalAppointments}
          hint={`${data.stats.monthAppointments} este mes`}
          icon={CalendarDays}
        />
        <ServiceMetricTA
          label="Ingresos históricos"
          value={formatCurrency(data.stats.totalRevenue, data.currency)}
          hint={`${formatCurrency(data.stats.monthRevenue, data.currency)} este mes`}
          icon={TrendingUp}
        />
        <ServiceMetricTA
          label="Tasa de finalización"
          value={`${data.stats.completionRate}%`}
          hint="Sobre las reservas históricas"
          icon={CheckCircle2}
        />
        <ServiceMetricTA
          label="Ticket promedio"
          value={formatCurrency(data.stats.avgPrice, data.currency)}
          hint="Por cita completada"
          icon={BarChart3}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <PanelTA
          title="Últimos siete días"
          description="Citas completadas · días con actividad registrada"
        >
          <div className="px-5 pb-5 sm:px-6">
            {data.weeklyTrend.length ? (
              <div className="flex h-48 items-end gap-3 pt-5">
                {data.weeklyTrend.map((day) => (
                  <div
                    key={day.label}
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                  >
                    <span className="text-xs font-semibold">{day.citas}</span>
                    <div
                      className="w-full max-w-14 rounded-t-lg bg-primary/80"
                      style={{
                        height: `${Math.max(4, (day.citas / maxTrend) * 120)}px`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="text-center text-[10px] text-muted-foreground">
                      {formatDate(day.label, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <StateTA
                title="Sin citas completadas recientes"
                description="Aquí verás la actividad del servicio durante los últimos siete días."
              />
            )}
          </div>
        </PanelTA>
        <PanelTA
          title="Estado de las reservas"
          description="Distribución histórica"
        >
          <div className="space-y-4 px-5 pb-6 sm:px-6">
            {data.statusDistribution.length ? (
              data.statusDistribution.map((item) => (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span>{serviceStatusLabel(item.name)}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${data.stats.totalAppointments ? (item.value / data.stats.totalAppointments) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <StateTA
                title="Sin reservas registradas"
                description="La distribución aparecerá cuando este servicio tenga actividad."
              />
            )}
          </div>
        </PanelTA>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <PanelTA
          title="Profesionales con más actividad"
          description="Hasta 10 profesionales · citas completadas"
        >
          <div className="divide-y divide-border">
            {data.topBarbers.length ? (
              data.topBarbers.map((professional, index) => (
                <div
                  key={professional.barber_id}
                  className="flex items-center gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="w-4 shrink-0 text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  {professional.photo_url ? (
                    <img
                      src={professional.photo_url}
                      alt=""
                      loading="lazy"
                      className="size-10 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                      {professional.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {professional.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {professional.total_citas} citas ·{" "}
                      {formatCurrency(
                        professional.total_revenue,
                        data.currency,
                      )}
                    </p>
                    {professional.specialty && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {professional.specialty}
                      </p>
                    )}
                  </div>
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver profesional ${professional.name}`}
                    onClick={() =>
                      navigate(`/admin/professionals/${professional.barber_id}`)
                    }
                  >
                    <ArrowUpRight className="size-4" />
                  </ButtonTA>
                </div>
              ))
            ) : (
              <StateTA
                title="Sin actividad profesional"
                description="Aquí se mostrarán los profesionales asociados a citas completadas."
              />
            )}
          </div>
        </PanelTA>
        <PanelTA
          title="Clientes frecuentes"
          description="Hasta 10 clientes · ordenados por su consumo"
        >
          <div className="divide-y divide-border">
            {data.topClients.length ? (
              data.topClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-start gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold">
                    {client.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {client.name}
                    </p>
                    {client.email && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {client.email}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {client.total_visits} visitas ·{" "}
                      {formatCurrency(client.total_spent, data.currency)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Última visita: {formatDate(client.last_visit)}
                    </p>
                  </div>
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`Ver cliente ${client.name}`}
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <ArrowUpRight className="size-4" />
                  </ButtonTA>
                </div>
              ))
            ) : (
              <StateTA
                title="Sin clientes frecuentes todavía"
                description="Los clientes aparecerán aquí al completar sus reservas."
              />
            )}
          </div>
        </PanelTA>
      </div>
    </section>
  );
};
