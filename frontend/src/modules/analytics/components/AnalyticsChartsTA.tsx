import { useTranslation } from "react-i18next";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { formatDate } from "@/i18n/formatters";
import type { AnalyticsBucket, AnalyticsOverview, PlatformAnalytics } from "@/modules/analytics/types";

// HELPERS
const dateLabel = (value: string): string => formatDate(value, { dateStyle: "medium" });

// COMPONENTS
export const AnalyticsTrendTA = ({ data, financial = false }: { data: AnalyticsOverview; financial?: boolean }) => {
  const { t } = useTranslation("analytics");
  return <InteractiveChartTA
    title={t(financial ? "financial" : "reservationTrend")}
    description={t("comparison")}
    data={data.series.map((row) => ({ label: row.date, values: { current: financial ? row.revenue : row.reservations, previous: financial ? row.previousRevenue : row.previousReservations } }))}
    series={[
      { key: "current", label: t("current"), format: financial ? "currency" : "number" },
      { key: "previous", label: t("previous"), format: financial ? "currency" : "number", color: "var(--chart-2)" },
    ]}
    currency={data.currency}
    initialType="area"
    allowedTypes={["area", "line", "bar", "table"]}
    labelFormatter={dateLabel}
  />;
};

export const AnalyticsDistributionTA = ({ title, rows, kind }: { title: string; rows: AnalyticsBucket[]; kind?: "status" | "weekday" }) => {
  const { t } = useTranslation("analytics");
  return <InteractiveChartTA
    title={title}
    data={rows.map((row) => ({ label: kind ? t(`${kind}.${row.id}`) : row.id, values: { count: row.value } }))}
    series={[{ key: "count", label: t("reservations") }]}
    initialType="bar"
    allowedTypes={["bar", "pie", "table"]}
    height={260}
  />;
};

export const AnalyticsGrowthTA = ({ data }: { data: PlatformAnalytics["growth"] }) => {
  const { t } = useTranslation("analytics");
  return <InteractiveChartTA
    title={t("growthTitle")}
    description={t("comparison")}
    data={data.map((row) => ({ label: row.date, values: { users: row.users, previousUsers: row.previousUsers, businesses: row.businesses, previousBusinesses: row.previousBusinesses } }))}
    series={[
      { key: "users", label: t("users"), color: "var(--chart-1)" },
      { key: "previousUsers", label: t("previousUsers"), color: "var(--chart-2)" },
      { key: "businesses", label: t("businesses"), color: "var(--chart-3)" },
      { key: "previousBusinesses", label: t("previousBusinesses"), color: "#B76D1B" },
    ]}
    labelFormatter={dateLabel}
    initialType="line"
    allowedTypes={["line", "area", "bar", "table"]}
  />;
};
