import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatNumber } from "@/i18n/formatters";
import { TooltipTA } from "@/components/TA/TooltipTA";
import type { AnalyticsMetric } from "@/modules/analytics/types";

// COMPONENT
export const AnalyticsMetricsTA = ({
  metrics,
  currency,
}: {
  metrics: AnalyticsMetric[];
  currency: string;
}) => {
  const { t } = useTranslation("analytics");
  return (
    <dl
      className={`grid min-w-0 grid-cols-2 gap-3 sm:gap-4 ${metrics.length === 6 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="stat-card min-w-0 rounded-2xl border border-primary/10 p-4 sm:p-5"
        >
          <dt className="flex items-start justify-between gap-2 text-xs leading-relaxed text-muted-foreground">
            <span>{t(`metric.${metric.id}`)}</span>
            <TooltipTA content={t(`definition.${metric.id}`)}>
              <Info className="size-3.5" />
            </TooltipTA>
          </dt>
          <dd className="mt-3 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
            {metric.value === null ? (
              <span className="text-base text-muted-foreground">
                {t("noData")}
              </span>
            ) : metric.unit === "currency" ? (
              formatCurrency(metric.value, currency)
            ) : (
              `${formatNumber(metric.value, { maximumFractionDigits: 2 })}${metric.unit === "percent" ? "%" : metric.unit === "minutes" ? " min" : metric.unit === "rating" ? "/5" : ""}`
            )}
          </dd>
          {metric.change !== null ? (
            <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
              {metric.change >= 0 ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {formatNumber(Math.abs(metric.change), {
                maximumFractionDigits: 1,
              })}
              % · {t("previous")}
            </p>
          ) : (
            metric.previous === 0 && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                {t("noBaseline")}
              </p>
            )
          )}
        </div>
      ))}
    </dl>
  );
};
