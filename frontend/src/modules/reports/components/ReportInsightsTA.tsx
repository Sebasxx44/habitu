import { ArrowUpRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PanelTA } from "@/components/TA/PanelTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { statusLabels } from "@/modules/dashboard/formatters";
import type { DetailedReport } from "@/modules/reports/types";

// TYPES
interface ReportInsightsProps {
  report: DetailedReport;
}

// COMPONENT
export const ReportInsightsTA = ({ report }: ReportInsightsProps) => {
  // DERIVED STATE
  const statuses = report.statusDistribution.map((item) => ({
    name: statusLabels[item.status] ?? item.status,
    value: item.count,
  }));
  const professionals = report.barberStats;
  const clients = [
    { name: "Nuevos", value: report.summary.newClients },
    { name: "Recurrentes", value: report.summary.returningClients },
  ];
  const money = (value: number): string =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: report.currency,
      maximumFractionDigits: 0,
    }).format(value);
  const opportunities = [
    {
      title: "Protege el valor de tu agenda",
      detail:
        report.summary.noShowRate > 0
          ? `${report.summary.noShowRate}% de las citas terminaron sin asistencia. Revisa confirmaciones, recordatorios y horarios con más ausencias antes de abrir nuevos cupos.`
          : "Mantén la confirmación y los recordatorios activos. Una agenda confiable facilita cubrir cancelaciones con la lista de espera.",
      href: "/admin/appointments",
      cta: "Gestionar citas",
    },
    {
      title: "Convierte visitas en relaciones",
      detail: `${report.summary.returningClients} de ${report.summary.totalClients} clientes ya habían reservado antes del período. Ofrece una próxima cita al finalizar el servicio y revisa qué clientes dejaron de volver.`,
      href: "/admin/clients",
      cta: "Revisar clientes",
    },
    {
      title: "Distingue ventas de caja",
      detail: `El valor realizado es ${money(report.summary.totalRevenue)}. Compáralo con los pagos completados y registra costos antes de evaluar ganancias o aumentar descuentos.`,
      href: "/admin/bi-dashboard",
      cta: "Revisar indicadores",
    },
  ];

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <InteractiveChartTA title="Qué sucede con tus citas" description="Distribución de estados de todas las citas del período." initialType="pie" allowedTypes={["bar", "pie", "table"]}
          data={statuses.map((item) => ({ label: item.name, values: { count: item.value } }))} series={[{ key: "count", label: "Citas" }]} />
        <InteractiveChartTA title="Valor realizado por profesional" description={`Todos los profesionales · Servicios completados en ${report.currency}; no representa comisión ni ganancia.`} currency={report.currency} initialType="bar" allowedTypes={["bar", "pie", "table"]}
          data={professionals.map((item) => ({ label: item.name, values: { revenue: item.revenue } }))} series={[{ key: "revenue", label: "Valor realizado", format: "currency" }]} />
        <InteractiveChartTA title="Clientes nuevos y recurrentes" description="Recurrente significa que tenía una cita anterior al inicio del período." initialType="pie" allowedTypes={["bar", "pie", "table"]}
          data={clients.map((item) => ({ label: item.name, values: { count: item.value } }))} series={[{ key: "count", label: "Clientes" }]} />
        <InteractiveChartTA title="Pagos completados por método" description={`Cobros registrados en ${report.currency}; los pagos pendientes quedan fuera.`} currency={report.currency} initialType="bar" allowedTypes={["bar", "pie", "table"]}
          data={report.paymentMethods.map((item) => ({ label: item.method, values: { revenue: item.revenue } }))} series={[{ key: "revenue", label: "Cobros completados", format: "currency" }]} />
      </div>
      {report.summary.totalAppointments > 0 && (
        <PanelTA
          title="Decisiones que puedes tomar hoy"
          description="Indicaciones basadas en la actividad del período; no son proyecciones de ganancias."
        >
          <div className="grid gap-3 px-5 pb-5 lg:grid-cols-3">
            {opportunities.map((item) => (
              <article
                key={item.title}
                className="flex flex-col rounded-xl border border-border bg-muted/20 p-4"
              >
                <Users className="mb-3 size-5 text-primary" />
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-muted-foreground">
                  {item.detail}
                </p>
                <Link
                  to={item.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  {item.cta}
                  <ArrowUpRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </PanelTA>
      )}
    </>
  );
};
