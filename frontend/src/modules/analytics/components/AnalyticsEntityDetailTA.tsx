import { useTranslation } from "react-i18next";
import { AnalyticsDistributionTA } from "@/modules/analytics/components/AnalyticsChartsTA";
import { formatNumber } from "@/i18n/formatters";
import type { PerformanceRow } from "@/modules/analytics/types";

// COMPONENT
export const AnalyticsEntityDetailTA = ({
  row,
  professional,
}: {
  row: PerformanceRow;
  professional: boolean;
}) => {
  const { t } = useTranslation("analytics");
  return (
    <div className="grid min-w-0 gap-5 p-5 lg:grid-cols-3">
      <dl className="space-y-5 text-xs">
        {professional && (
          <div>
            <dt className="text-muted-foreground">{t("metric.rating")}</dt>
            <dd className="mt-2 text-lg font-semibold">
              {row.rating == null
                ? t("noData")
                : `${formatNumber(row.rating, { maximumFractionDigits: 2 })}/5`}
            </dd>
            <p className="mt-2 text-muted-foreground">
              {t("verifiedReviews", { count: row.ratingCount ?? 0 })}
            </p>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">{t("metric.occupancy")}</dt>
          <dd className="mt-2 font-medium">{t("noData")}</dd>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            {t("definition.occupancy")}
          </p>
        </div>
      </dl>
      <div>
        <h3 className="mb-3 text-sm font-medium">{t("services")}</h3>
        <ul className="space-y-3 text-xs">
          {row.services?.map((service) => (
            <li key={service.id} className="flex justify-between gap-4">
              <span>{service.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatNumber(service.reservations)} · {t("reservations")}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <AnalyticsDistributionTA title={t("hours")} rows={row.hours ?? []} />
    </div>
  );
};
