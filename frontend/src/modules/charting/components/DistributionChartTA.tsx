import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { StateTA } from "@/components/TA/StateTA";
import {
  canUsePie,
  CHART_COLORS,
  chartSeriesName,
  chartSlices,
  formatChartValue,
} from "@/modules/charting/models";
import type { ChartViewProps } from "@/modules/charting/types";

// COMPONENT
export const DistributionChartTA = ({
  title,
  data,
  currency,
  pieSeries,
  height,
  labelFormatter,
  locale,
  labels,
  animate,
}: ChartViewProps) => {
  // COMPUTED
  if (!pieSeries || !canUsePie(data, pieSeries)) {
    return (
      <StateTA title={labels.type.pie} description={labels.pieUnavailable} />
    );
  }
  const slices = chartSlices(data, pieSeries.key);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          style={{ height }}
          className="min-w-0"
          aria-label={`${title} · ${chartSeriesName(pieSeries, currency)}`}
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 280, height }}
          >
            <PieChart accessibilityLayer>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="54%"
                outerRadius="85%"
                stroke="hsl(var(--card))"
                strokeWidth={2}
                isAnimationActive={animate}
                animationDuration={280}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.label}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                formatter={(value, name) => [
                  formatChartValue(
                    typeof value === "number" ? value : null,
                    pieSeries.format,
                    currency,
                    locale,
                    labels.missing,
                  ),
                  labelFormatter(String(name)),
                ]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 self-center">
          <p className="text-xs text-muted-foreground">
            {labels.total} · {chartSeriesName(pieSeries, currency)}
          </p>
          <p className="mt-1 break-words text-2xl font-bold tracking-tight tabular-nums">
            {formatChartValue(
              total,
              pieSeries.format,
              currency,
              locale,
              labels.missing,
            )}
          </p>
          <ul
            className="mt-4 max-h-56 space-y-3 overflow-y-auto pr-2 text-xs"
            aria-label={labels.type.pie}
          >
            {slices.map((slice, index) => (
              <li
                key={slice.label}
                className="flex items-start justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                    aria-hidden="true"
                  />
                  <span className="break-words">
                    {labelFormatter(slice.label)}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {formatChartValue(
                    slice.value,
                    pieSeries.format,
                    currency,
                    locale,
                    labels.missing,
                  )}
                  <span className="block text-muted-foreground">
                    {formatChartValue(
                      (slice.value / total) * 100,
                      "percent",
                      currency,
                      locale,
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {labels.pieExplanation}
      </p>
    </div>
  );
};
