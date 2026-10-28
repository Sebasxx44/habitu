import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import type { HomeServiceMetrics } from "@/modules/home-service/analytics";

// TYPES
interface OnDemandAnalyticsProps { metrics: HomeServiceMetrics; }

// COMPONENT
export const OnDemandAnalyticsTA = ({ metrics }: OnDemandAnalyticsProps) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <InteractiveChartTA title="Cómo se distribuye la operación" description="Estado actual de todas las solicitudes creadas en el período." initialType="bar" allowedTypes={["bar", "pie", "table"]}
      data={metrics.statuses.map((item) => ({ label: item.label, values: { count: item.count } }))}
      series={[{ key: "count", label: "Solicitudes" }]} />
    <InteractiveChartTA title="Demanda y servicios completados" description="Creaciones y finalizaciones por fecha en el período · Bogotá." initialType="line"
      data={metrics.daily.map((item) => ({ label: item.date, values: { created: item.created, completed: item.completed } }))}
      labelFormatter={(label) => new Date(`${label}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
      series={[{ key: "created", label: "Solicitudes nuevas" }, { key: "completed", label: "Servicios completados", color: "#087f70" }]} />
  </div>
);
