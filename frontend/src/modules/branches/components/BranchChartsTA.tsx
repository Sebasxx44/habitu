import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import type { BranchAnalytics } from "@/modules/branches/types";

// COMPONENT
export const BranchChartsTA = ({ branches, currency }: { branches: BranchAnalytics[]; currency: string }) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <InteractiveChartTA title="Rendimiento por sede" description={`Todas las sedes filtradas · Valor de servicios completados en ${currency}; no representa utilidad ni cobros.`} currency={currency} initialType="bar" allowedTypes={["bar", "pie", "table"]}
      data={branches.map((branch) => ({ label: branch.name, values: { revenue: branch.metrics.revenue } }))}
      series={[{ key: "revenue", label: "Valor realizado", format: "currency" }]} />
    <InteractiveChartTA title="Resultado de las reservas" description="Citas del período en todas las sedes filtradas." initialType="bar" allowedTypes={["bar", "pie", "table"]}
      data={branches.map((branch) => ({ label: branch.name, values: { completed: branch.metrics.completed, cancelled: branch.metrics.cancelled, noShow: branch.metrics.noShow } }))}
      series={[{ key: "completed", label: "Completadas" }, { key: "cancelled", label: "Canceladas", color: "#d97706" }, { key: "noShow", label: "Ausencias", color: "#e11d48" }]} />
  </div>
);
