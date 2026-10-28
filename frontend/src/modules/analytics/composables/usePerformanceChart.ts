import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  PerformanceChartState,
  PerformanceMeasure,
  PerformanceRow,
} from "@/modules/analytics/types";

// COMPOSABLE
export const usePerformanceChart = (
  rows: PerformanceRow[],
): PerformanceChartState => {
  // STATE
  const { t } = useTranslation("analytics");
  const [measure, setMeasure] = useState<PerformanceMeasure>("reservations");

  // PUBLIC API
  return {
    selection: { measure, setMeasure },
    chart: {
      data: rows.map((row) => ({
        label: `${row.name} · #${row.id}`,
        values: { value: row[measure] },
      })),
      series: [
        {
          key: "value",
          label: t(measure),
          format: measure === "revenue" ? "currency" : "number",
        },
      ],
    },
  };
};
