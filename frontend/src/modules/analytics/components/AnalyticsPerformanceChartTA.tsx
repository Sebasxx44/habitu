import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { usePerformanceChart } from "@/modules/analytics/composables/usePerformanceChart";
import type {
  PerformanceMeasure,
  PerformanceRow,
} from "@/modules/analytics/types";

// CONSTANTS
const measures: PerformanceMeasure[] = [
  "reservations",
  "completed",
  "cancelled",
  "revenue",
];

// COMPONENT
export const AnalyticsPerformanceChartTA = ({
  rows,
  currency,
  title,
}: {
  rows: PerformanceRow[];
  currency: string;
  title: string;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("analytics");
  const { selection, chart } = usePerformanceChart(rows);

  // RENDER
  return (
    <div className="space-y-3 border-b border-border p-4 sm:p-5">
      <div className="flex flex-wrap gap-2" aria-label={t("measure")}>
        {measures.map((measure) => (
          <ButtonTA
            key={measure}
            variant={selection.measure === measure ? "default" : "outline"}
            size="sm"
            aria-pressed={selection.measure === measure}
            onClick={() => selection.setMeasure(measure)}
          >
            {t(measure)}
          </ButtonTA>
        ))}
      </div>
      <InteractiveChartTA
        embedded
        title={`${title} · ${t(selection.measure)}`}
        description={t("chartSample")}
        data={chart.data}
        series={chart.series}
        currency={currency}
        initialType="bar"
        allowedTypes={["bar", "pie", "table"]}
        height={280}
      />
    </div>
  );
};
