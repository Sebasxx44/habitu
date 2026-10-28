import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import type {
  ChartDatum,
  ChartLabels,
  ChartZoomResult,
} from "@/modules/charting/types";

// TYPES
interface ChartZoomControlsProps {
  id: string;
  data: ChartDatum[];
  zoom: ChartZoomResult;
  labels: ChartLabels;
  labelFormatter: (label: string) => string;
}

// COMPONENT
export const ChartZoomControlsTA = ({
  id,
  data,
  zoom,
  labels,
  labelFormatter,
}: ChartZoomControlsProps) => {
  // COMPUTED
  const { window, actions } = zoom;
  if (window.total < 2) return null;

  const startLabel = labelFormatter(data[window.range.start]?.label ?? "");
  const endLabel = labelFormatter(data[window.range.end]?.label ?? "");

  return (
    <div className="space-y-3 rounded-xl border border-primary/10 bg-primary/[0.035] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-xs font-medium text-foreground"
          role="status"
          aria-live="polite"
        >
          {labels.shown} {window.size} {labels.of} {window.total}{" "}
          {labels.points}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ButtonTA
            variant="ghost"
            size="icon"
            onClick={actions.moveBack}
            disabled={!window.canMoveBack}
            aria-label={labels.previous}
            title={labels.previous}
          >
            <ChevronLeft className="size-4" />
          </ButtonTA>
          <ButtonTA
            variant="ghost"
            size="icon"
            onClick={actions.zoomIn}
            disabled={!window.canZoomIn}
            aria-label={labels.zoomIn}
            title={labels.zoomIn}
          >
            <ZoomIn className="size-4" />
          </ButtonTA>
          <ButtonTA
            variant="ghost"
            size="icon"
            onClick={actions.zoomOut}
            disabled={!window.isZoomed}
            aria-label={labels.zoomOut}
            title={labels.zoomOut}
          >
            <ZoomOut className="size-4" />
          </ButtonTA>
          <ButtonTA
            variant="ghost"
            size="icon"
            onClick={actions.moveForward}
            disabled={!window.canMoveForward}
            aria-label={labels.next}
            title={labels.next}
          >
            <ChevronRight className="size-4" />
          </ButtonTA>
          <ButtonTA
            variant="ghost"
            size="sm"
            onClick={actions.reset}
            disabled={!window.isZoomed}
            className="gap-1 px-2 text-xs"
          >
            <RotateCcw className="size-3.5" />
            {labels.reset}
          </ButtonTA>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor={`${id}-start`}
            className="flex justify-between gap-2 text-[11px] text-muted-foreground"
          >
            <span>{labels.rangeStart}</span>
            <span className="truncate font-medium text-foreground">
              {startLabel}
            </span>
          </label>
          <input
            id={`${id}-start`}
            type="range"
            min={0}
            max={data.length - 1}
            step={1}
            value={window.range.start}
            onChange={(event) => actions.setStart(Number(event.target.value))}
            aria-valuetext={startLabel}
            aria-describedby={`${id}-hint`}
            className="h-9 w-full cursor-pointer accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
        <div className="min-w-0">
          <label
            htmlFor={`${id}-end`}
            className="flex justify-between gap-2 text-[11px] text-muted-foreground"
          >
            <span>{labels.rangeEnd}</span>
            <span className="truncate font-medium text-foreground">
              {endLabel}
            </span>
          </label>
          <input
            id={`${id}-end`}
            type="range"
            min={0}
            max={data.length - 1}
            step={1}
            value={window.range.end}
            onChange={(event) => actions.setEnd(Number(event.target.value))}
            aria-valuetext={endLabel}
            aria-describedby={`${id}-hint`}
            className="h-9 w-full cursor-pointer accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </div>
      </div>
      <p
        id={`${id}-hint`}
        className="text-[11px] leading-relaxed text-muted-foreground"
      >
        {labels.hint} {window.isZoomed && labels.periodScope}
      </p>
    </div>
  );
};
