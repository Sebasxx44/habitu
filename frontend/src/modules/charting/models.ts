import type {
  ChartDatum,
  ChartRange,
  ChartSeries,
  ChartSlice,
  ChartType,
  ChartValueFormat,
} from "@/modules/charting/types";

// DATA
export const chartValue = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const normalizeChartData = (
  data: ChartDatum[],
  series: ChartSeries[],
): ChartDatum[] =>
  data.map((datum) => ({
    label: datum.label,
    values: Object.fromEntries(
      series.map(({ key }) => [key, chartValue(datum.values[key])]),
    ),
  }));

export const chartHasValues = (
  data: ChartDatum[],
  series: ChartSeries[],
): boolean =>
  data.some((datum) =>
    series.some(({ key }) => chartValue(datum.values[key]) !== null),
  );

export const chartSlices = (data: ChartDatum[], key: string): ChartSlice[] => {
  const grouped = new Map<string, number>();
  for (const datum of data) {
    const value = chartValue(datum.values[key]);
    if (value === null) continue;
    grouped.set(datum.label, (grouped.get(datum.label) ?? 0) + value);
  }
  return Array.from(grouped, ([label, value]) => ({ label, value }));
};

export const canUsePie = (data: ChartDatum[], series: ChartSeries): boolean => {
  if (series.format === "percent") return false;
  const values = data.map((datum) => chartValue(datum.values[series.key]));
  return (
    values.some((value) => value !== null && value > 0) &&
    values.every((value) => value === null || value >= 0)
  );
};

// RANGE
export const fullChartRange = (count: number): ChartRange => ({
  start: 0,
  end: Math.max(0, count - 1),
});

export const clampChartRange = (
  range: ChartRange,
  count: number,
): ChartRange => {
  const maximum = Math.max(0, count - 1);
  const start = Math.max(0, Math.min(maximum, Math.floor(range.start)));
  return {
    start,
    end: Math.max(start, Math.min(maximum, Math.floor(range.end))),
  };
};

export const resizeChartRange = (
  range: ChartRange,
  count: number,
  direction: "in" | "out",
): ChartRange => {
  if (count < 2) return fullChartRange(count);
  const current = clampChartRange(range, count);
  const size = current.end - current.start + 1;
  if (direction === "in" && size <= 2) return current;
  const nextSize =
    direction === "in"
      ? Math.max(2, Math.ceil(size / 2))
      : Math.min(count, Math.max(2, size * 2));
  const center = (current.start + current.end) / 2;
  const start = Math.max(
    0,
    Math.min(count - nextSize, Math.floor(center - (nextSize - 1) / 2)),
  );
  return { start, end: start + nextSize - 1 };
};

export const moveChartRange = (
  range: ChartRange,
  count: number,
  direction: "back" | "forward",
): ChartRange => {
  const current = clampChartRange(range, count);
  const size = current.end - current.start + 1;
  const distance =
    Math.max(1, Math.floor(size / 2)) * (direction === "back" ? -1 : 1);
  const start = Math.max(
    0,
    Math.min(Math.max(0, count - size), current.start + distance),
  );
  return { start, end: start + size - 1 };
};

// PRESENTATION
export const availableChartTypes = (allowed?: ChartType[]): ChartType[] =>
  Array.from(
    new Set<ChartType>([
      ...(allowed ?? ["line", "area", "bar", "pie"]),
      "table",
    ]),
  );

export const visibleChartSeries = (
  series: ChartSeries[],
  hidden: string[],
): ChartSeries[] => {
  const visible = series.filter(({ key }) => !hidden.includes(key));
  return visible.length ? visible : series.slice(0, 1);
};

export const toggleChartSeries = (
  series: ChartSeries[],
  hidden: string[],
  key: string,
): string[] => {
  if (!series.some((item) => item.key === key)) return hidden;
  const visible = visibleChartSeries(series, hidden);
  if (visible.some((item) => item.key === key) && visible.length === 1)
    return hidden;
  return hidden.includes(key)
    ? hidden.filter((item) => item !== key)
    : [...hidden, key];
};

export const formatChartValue = (
  value: number | null | undefined,
  format: ChartValueFormat = "number",
  currency = "COP",
  locale = "es-CO",
  missing = "Sin dato",
  compact = false,
): string => {
  const finiteValue = chartValue(value);
  if (finiteValue === null) return missing;
  const options: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    notation: compact ? "compact" : "standard",
  };
  if (format === "currency") {
    options.style = "currency";
    options.currency = currency;
    options.currencyDisplay = "code";
    options.minimumFractionDigits = 0;
  }
  const formatted = new Intl.NumberFormat(locale, options).format(finiteValue);
  return format === "percent" ? `${formatted}%` : formatted;
};

export const chartSeriesName = (
  series: ChartSeries,
  currency: string,
): string =>
  `${series.label}${series.format === "currency" ? ` · ${currency}` : series.format === "percent" ? " · %" : ""}`;

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "#8b5cf6",
  "#0d9488",
  "#e87924",
  "#db2777",
  "#65a30d",
  "#0284c7",
  "#a16207",
];
