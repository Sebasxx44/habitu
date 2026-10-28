import { useState } from "react";
import {
  availableChartTypes,
  toggleChartSeries,
  visibleChartSeries,
} from "@/modules/charting/models";
import type {
  ChartPresentationResult,
  ChartSeries,
  ChartType,
} from "@/modules/charting/types";

// COMPOSABLE
export const useChartPresentation = (
  series: ChartSeries[],
  initialType: ChartType = "area",
  allowedTypes?: ChartType[],
): ChartPresentationResult => {
  // STATE
  const [selectedType, setType] = useState<ChartType>(initialType);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [selectedPieKey, selectPieSeries] = useState("");
  const [expanded, setExpanded] = useState(false);

  // COMPUTED
  const types = availableChartTypes(allowedTypes);
  const type = types.includes(selectedType) ? selectedType : types[0];
  const visibleSeries = visibleChartSeries(series, hiddenSeries);
  const pieSeries =
    visibleSeries.find(({ key }) => key === selectedPieKey) ??
    visibleSeries.find((item) => item.format !== "percent") ??
    visibleSeries[0];

  // ACTIONS
  return {
    presentation: { type, types, visibleSeries, pieSeries, expanded },
    actions: {
      setType,
      toggleSeries: (key) =>
        setHiddenSeries((hidden) => toggleChartSeries(series, hidden, key)),
      selectPieSeries,
      setExpanded,
    },
  };
};
