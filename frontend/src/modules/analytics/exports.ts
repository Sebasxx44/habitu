import type { AnalyticsOverview } from "@/modules/analytics/types";

// SERIALIZATION
export const analyticsCsvCell = (value: string | number | null): string => {
  let text = value === null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text) && typeof value === "string") text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
export const analyticsCsv = (
  data: AnalyticsOverview,
  label: (key: string) => string,
): string => {
  const rows: (string | number | null)[][] = [
    ["scope", data.scope.name],
    ["period", data.period.start, data.period.end],
    ["currency", data.currency],
    ["metric", "value", "previous", "change_percent", "definition"],
    ...[...(data.platform?.metrics ?? []), ...data.metrics].map((metric) => [
      label(`metric.${metric.id}`),
      metric.value,
      metric.previous,
      metric.change,
      label(`definition.${metric.id}`),
    ]),
    [],
    [
      "date",
      "reservations",
      "completed",
      "cancelled",
      "completed_value",
      "previous_reservations",
      "previous_completed_value",
    ],
    ...data.series.map((day) => [
      day.date,
      day.reservations,
      day.completed,
      day.cancelled,
      day.revenue,
      day.previousReservations,
      day.previousRevenue,
    ]),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(analyticsCsvCell).join(",")).join("\r\n")
  );
};
export const downloadAnalyticsCsv = (
  data: AnalyticsOverview,
  label: (key: string) => string,
): void => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([analyticsCsv(data, label)], { type: "text/csv;charset=utf-8" }),
  );
  link.href = url;
  link.download = `habitu-analytics-${data.scope.id ?? "platform"}-${data.period.start}-${data.period.end}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
