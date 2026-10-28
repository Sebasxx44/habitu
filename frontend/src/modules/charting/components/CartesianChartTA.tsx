import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartSeriesName, formatChartValue } from "@/modules/charting/models";
import type { ChartDatum, ChartViewProps } from "@/modules/charting/types";

// COMPONENT
export const CartesianChartTA = ({
  title,
  data,
  series,
  type,
  currency,
  labelFormatter,
  height,
  locale,
  labels,
  animate,
}: ChartViewProps) => {
  // COMPUTED
  const formats = Array.from(
    new Set(series.map((item) => item.format ?? "number")),
  );

  return (
    <div
      className="w-full min-w-0"
      style={{ height }}
      aria-label={`${title} · ${labels.type[type]}`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 320, height }}
      >
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 12, bottom: 12, left: 0 }}
          accessibilityLayer
        >
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--border))"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tickFormatter={(value: string) => {
              const label = labelFormatter(value);
              return label.length > 24 ? `${label.slice(0, 23)}…` : label;
            }}
            minTickGap={32}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickMargin={12}
          />
          {formats.map((format, index) => (
            <YAxis
              key={format}
              yAxisId={format}
              orientation={index === 0 ? "left" : "right"}
              width={format === "currency" ? 60 : 42}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              allowDecimals={
                format !== "number" ||
                series.some(
                  (item) =>
                    (item.format ?? "number") === format &&
                    data.some((datum) => {
                      const value = datum.values[item.key];
                      return value !== null && !Number.isInteger(value);
                    }),
                )
              }
              tickFormatter={(value: number) =>
                formatChartValue(
                  value,
                  format === "currency" ? "number" : format,
                  currency,
                  locale,
                  labels.missing,
                  true,
                )
              }
              label={
                format === "currency"
                  ? {
                      value: currency,
                      position: "insideTopLeft",
                      offset: -14,
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }
                  : undefined
              }
            />
          ))}
          <Tooltip
            isAnimationActive={false}
            filterNull={false}
            labelFormatter={(label) => labelFormatter(String(label ?? ""))}
            formatter={(value, name) => {
              const item = series.find(
                (candidate) => candidate.key === String(name),
              );
              return [
                formatChartValue(
                  typeof value === "number" ? value : null,
                  item?.format,
                  currency,
                  locale,
                  labels.missing,
                ),
                item ? chartSeriesName(item, currency) : String(name),
              ];
            }}
            contentStyle={{
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
              maxWidth: "min(320px, 80vw)",
              whiteSpace: "normal",
              boxShadow: "0 8px 30px hsl(var(--foreground) / 0.08)",
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: 600,
              marginBottom: 6,
            }}
          />
          {series.map((item, index) => {
            const common = {
              name: item.key,
              dataKey: (datum: ChartDatum) => datum.values[item.key],
              yAxisId: item.format ?? "number",
              stroke: item.color,
              fill: item.color,
              isAnimationActive: animate,
              animationDuration: 280,
            };
            if (type === "bar") {
              return (
                <Bar
                  key={item.key}
                  {...common}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              );
            }
            if (type === "line") {
              return (
                <Line
                  key={item.key}
                  {...common}
                  type="linear"
                  connectNulls={false}
                  strokeWidth={2.5}
                  strokeDasharray={index > 0 ? "5 4" : undefined}
                  dot={data.length < 15 ? { r: 3, strokeWidth: 2 } : false}
                  activeDot={{ r: 5 }}
                />
              );
            }
            return (
              <Area
                key={item.key}
                {...common}
                type="linear"
                connectNulls={false}
                strokeWidth={2.5}
                strokeDasharray={index > 0 ? "5 4" : undefined}
                fillOpacity={index === 0 ? 0.14 : 0.06}
                dot={data.length < 10 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
