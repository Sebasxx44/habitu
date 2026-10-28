import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { formatDay, formatMoney } from "@/modules/dashboard/formatters";
import { formatNumber } from "@/i18n/formatters";
import { useDashboardChart } from "@/modules/dashboard/composables/useDashboardChart";
import type { DashboardOverview } from "@/modules/dashboard/types";

// COMPONENT
export const ActivityChartTA = ({ data }: { data: DashboardOverview }) => {
  // COMPOSABLES
  const { t } = useTranslation();
  const { selection, chart } = useDashboardChart(data);

  // RENDER
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold tabular-nums">{selection.measure === "revenue" ? formatMoney(chart.total, data.currency) : formatNumber(chart.total)} <span className="font-normal text-muted-foreground">· {t("analytics:seriesTotal")}</span></p>
      {!selection.isClient && <div className="flex flex-wrap gap-1" aria-label={t("dashboard.chartMeasure")}>
        {(["appointments", "revenue"] as const).map((measure) => <ButtonTA key={measure} size="sm" variant={selection.measure === measure ? "default" : "outline"} aria-pressed={selection.measure === measure} onClick={() => selection.setMeasure(measure)}>{t(`dashboard.${measure}`)}</ButtonTA>)}
      </div>}
    </div>
    <InteractiveChartTA
      title={t(selection.isClient ? "dashboard.activity" : "dashboard.pulse")}
      description={`${formatDay(data.period.start)} — ${formatDay(data.period.end)} · ${t("dashboard.days", { count: data.period.days })}`}
      data={chart.points}
      series={chart.series}
      currency={data.currency}
      labelFormatter={(label) => formatDay(label, true)}
      initialType="area"
      allowedTypes={["area", "line", "bar", "table"]}
      height={280}
    />
  </div>;
};
