import { chartSeriesName, formatChartValue } from "@/modules/charting/models";
import type { ChartViewProps } from "@/modules/charting/types";

// COMPONENT
export const ChartTableTA = ({
  title,
  data,
  series,
  currency,
  locale,
  labels,
  labelFormatter,
}: ChartViewProps) => (
  <div
    className="max-h-[30rem] overflow-auto rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    role="region"
    aria-label={`${title} · ${labels.type.table}`}
    tabIndex={0}
  >
    <table className="w-full text-left text-sm">
      <caption className="p-4 text-left text-xs leading-relaxed text-muted-foreground">
        {labels.tableDescription}
      </caption>
      <thead className="sticky top-0 z-10 bg-muted text-foreground">
        <tr>
          <th scope="col" className="min-w-32 px-4 py-3 font-semibold">
            {labels.label}
          </th>
          {series.map((item) => (
            <th
              key={item.key}
              scope="col"
              className="min-w-32 px-4 py-3 text-right font-semibold"
            >
              {chartSeriesName(item, currency)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {data.map((datum, index) => (
          <tr
            key={`${datum.label}-${index}`}
            className="even:bg-primary/[0.025] hover:bg-primary/5"
          >
            <th scope="row" className="px-4 py-3 font-medium">
              {labelFormatter(datum.label)}
            </th>
            {series.map((item) => (
              <td
                key={item.key}
                className="whitespace-nowrap px-4 py-3 text-right tabular-nums"
              >
                {formatChartValue(
                  datum.values[item.key],
                  item.format,
                  currency,
                  locale,
                  labels.missing,
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
