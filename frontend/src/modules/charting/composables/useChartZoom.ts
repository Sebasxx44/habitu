import { useState } from "react";
import {
  clampChartRange,
  fullChartRange,
  moveChartRange,
  resizeChartRange,
} from "@/modules/charting/models";
import type {
  ChartDatum,
  ChartRange,
  ChartZoomResult,
} from "@/modules/charting/types";

// COMPOSABLE
export const useChartZoom = (data: ChartDatum[]): ChartZoomResult => {
  // STATE
  const signature = JSON.stringify(data.map(({ label }) => label));
  const [selection, setSelection] = useState<{
    signature: string;
    range: ChartRange;
  }>(() => ({
    signature,
    range: fullChartRange(data.length),
  }));

  // COMPUTED
  const range =
    selection.signature === signature
      ? clampChartRange(selection.range, data.length)
      : fullChartRange(data.length);
  const visibleData = data.slice(range.start, range.end + 1);
  const isZoomed =
    range.start !== 0 || range.end !== Math.max(0, data.length - 1);

  // ACTIONS
  const update = (nextRange: ChartRange): void =>
    setSelection({ signature, range: clampChartRange(nextRange, data.length) });

  return {
    window: {
      range,
      data: visibleData,
      size: visibleData.length,
      total: data.length,
      isZoomed,
      canZoomIn: visibleData.length > 2,
      canMoveBack: range.start > 0,
      canMoveForward: range.end < data.length - 1,
    },
    actions: {
      zoomIn: () => update(resizeChartRange(range, data.length, "in")),
      zoomOut: () => update(resizeChartRange(range, data.length, "out")),
      reset: () => update(fullChartRange(data.length)),
      moveBack: () => update(moveChartRange(range, data.length, "back")),
      moveForward: () => update(moveChartRange(range, data.length, "forward")),
      setStart: (start) =>
        update({ start: Math.min(start, range.end), end: range.end }),
      setEnd: (end) =>
        update({ start: range.start, end: Math.max(end, range.start) }),
    },
  };
};
