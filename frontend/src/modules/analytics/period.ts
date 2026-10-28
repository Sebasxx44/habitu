import type { AnalyticsFilters } from "@/modules/analytics/types";

// PERIOD
export const analyticsToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
export const initialAnalyticsFilters = (): AnalyticsFilters => {
  const end = analyticsToday();
  const start = new Date(`${end}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    preset: "30",
    start: start.toISOString().slice(0, 10),
    end,
    currency: "COP",
    grain: "day",
  };
};
export const validAnalyticsRange = (
  start: string,
  end: string,
  today = analyticsToday(),
): boolean => {
  const dates = [start, end].map((value) => new Date(`${value}T12:00:00Z`));
  if (
    [start, end].some(
      (value, index) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(dates[index].getTime()) ||
        dates[index].toISOString().slice(0, 10) !== value,
    )
  )
    return false;
  const days = (dates[1].getTime() - dates[0].getTime()) / 86400000;
  return days >= 0 && days < 366 && end <= today;
};
export const analyticsQuery = (filters: AnalyticsFilters): URLSearchParams => {
  const query = new URLSearchParams({
    currency: filters.currency,
    grain: filters.grain,
  });
  if (filters.preset === "custom") {
    query.set("start_date", filters.start);
    query.set("end_date", filters.end);
  } else query.set("days", filters.preset);
  return query;
};
