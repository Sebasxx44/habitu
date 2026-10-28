import { Maximize2 } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { chartSeriesName } from "@/modules/charting/models";
import type {
  ChartLabels,
  ChartPresentationResult,
  ChartSeries,
} from "@/modules/charting/types";

// TYPES
interface ChartToolbarProps {
  id: string;
  settings: ChartPresentationResult;
  series: ChartSeries[];
  currency: string;
  labels: ChartLabels;
  expanded?: boolean;
}

// COMPONENT
export const ChartToolbarTA = ({
  id,
  settings,
  series,
  currency,
  labels,
  expanded = false,
}: ChartToolbarProps) => {
  // COMPUTED
  const { presentation, actions } = settings;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label={labels.chartType}
          className="flex flex-wrap gap-1 rounded-xl border border-primary/10 bg-primary/[0.035] p-1"
        >
          {presentation.types.map((type) => (
            <ButtonTA
              key={type}
              variant={presentation.type === type ? "default" : "ghost"}
              size="sm"
              onClick={() => actions.setType(type)}
              aria-pressed={presentation.type === type}
              className="px-3 text-xs"
            >
              {labels.type[type]}
            </ButtonTA>
          ))}
        </div>
        {!expanded && (
          <ButtonTA
            variant="outline"
            size="icon"
            onClick={() => actions.setExpanded(true)}
            title={labels.expand}
            aria-label={labels.expand}
          >
            <Maximize2 className="size-4" />
          </ButtonTA>
        )}
      </div>
      {series.length > 1 && (
        <div
          role="group"
          aria-label={labels.series}
          className="flex flex-wrap gap-2"
        >
          {series.map((item) => {
            const selected = presentation.visibleSeries.some(
              (visible) => visible.key === item.key,
            );
            const last = selected && presentation.visibleSeries.length === 1;
            return (
              <ButtonTA
                key={item.key}
                variant="ghost"
                size="sm"
                onClick={() => actions.toggleSeries(item.key)}
                aria-pressed={selected}
                aria-disabled={last}
                title={last ? labels.lastSeries : undefined}
                className={`min-h-9 max-w-full gap-2 rounded-lg px-2 text-xs ${selected ? "bg-primary/5 text-foreground" : "text-muted-foreground opacity-60"}`}
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${selected ? "" : "opacity-30"}`}
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                <span className="truncate">
                  {chartSeriesName(item, currency)}
                </span>
              </ButtonTA>
            );
          })}
        </div>
      )}
      {series.length === 1 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full"
            style={{ background: series[0].color }}
            aria-hidden="true"
          />
          {chartSeriesName(series[0], currency)}
        </p>
      )}
      {presentation.type === "pie" && presentation.visibleSeries.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`${id}-measure`}
            className="text-xs text-muted-foreground"
          >
            {labels.pieSeries}
          </label>
          <select
            id={`${id}-measure`}
            value={presentation.pieSeries?.key ?? ""}
            onChange={(event) => actions.selectPieSeries(event.target.value)}
            className="min-h-11 max-w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {presentation.visibleSeries.map((item) => (
              <option key={item.key} value={item.key}>
                {chartSeriesName(item, currency)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
