import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  DashboardChartState,
  DashboardOverview,
} from "@/modules/dashboard/types";

// COMPOSABLE
export const useDashboardChart = (
  data: DashboardOverview,
): DashboardChartState => {
  // STATE
  const { t } = useTranslation();
  const [measure, setMeasure] = useState<"appointments" | "revenue">(
    "appointments",
  );

  // COMPUTED
  const isClient = data.role === "CLIENTE";
  const active = isClient ? "appointments" : measure;
  const points = data.series.map((day) => ({
    label: day.date,
    values: { value: day[active] },
  }));
  const total = data.series.reduce((sum, day) => sum + day[active], 0);

  // PUBLIC API
  return {
    selection: { measure: active, setMeasure, isClient },
    chart: {
      points,
      total,
      series: [
        {
          key: "value",
          label: t(
            active === "revenue"
              ? "dashboard.completedServices"
              : "dashboard.appointments",
          ),
          format: active === "revenue" ? "currency" : "number",
        },
      ],
    },
  };
};
