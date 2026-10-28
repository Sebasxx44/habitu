import { useId, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChartNoAxesCombined } from "lucide-react";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CartesianChartTA } from "@/modules/charting/components/CartesianChartTA";
import { ChartTableTA } from "@/modules/charting/components/ChartTableTA";
import { ChartToolbarTA } from "@/modules/charting/components/ChartToolbarTA";
import { ChartZoomControlsTA } from "@/modules/charting/components/ChartZoomControlsTA";
import { DistributionChartTA } from "@/modules/charting/components/DistributionChartTA";
import { useChartPresentation } from "@/modules/charting/composables/useChartPresentation";
import { useChartZoom } from "@/modules/charting/composables/useChartZoom";
import {
  CHART_COLORS,
  chartHasValues,
  normalizeChartData,
} from "@/modules/charting/models";
import { chartLabels } from "@/modules/charting/labels";
import type {
  ChartViewProps,
  InteractiveChartProps,
} from "@/modules/charting/types";

// FORMATTERS
const identityLabel = (label: string): string => label;

// COMPONENT
export const InteractiveChartTA = ({
  title,
  description,
  data,
  series,
  currency = "COP",
  initialType = "area",
  allowedTypes,
  labelFormatter = identityLabel,
  height = 280,
  embedded = false,
}: InteractiveChartProps) => {
  // COMPOSABLES
  const id = useId();
  const { i18n } = useTranslation();
  const reducedMotion = useReducedMotion();

  // COMPUTED
  const labels = chartLabels[i18n.resolvedLanguage === "en" ? "en" : "es"];
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "es-CO";
  const coloredSeries = useMemo(
    () =>
      series.map((item, index) => ({
        ...item,
        color: item.color ?? CHART_COLORS[index % CHART_COLORS.length],
      })),
    [series],
  );
  const normalizedData = useMemo(
    () => normalizeChartData(data, coloredSeries),
    [data, coloredSeries],
  );

  // COMPOSABLES
  const zoom = useChartZoom(normalizedData);
  const settings = useChartPresentation(
    coloredSeries,
    initialType,
    allowedTypes,
  );
  const hasValues = chartHasValues(
    zoom.window.data,
    settings.presentation.visibleSeries,
  );

  // RENDER
  const renderExplorer = (expanded: boolean) => {
    const explorerId = `${id}-${expanded ? "expanded" : "inline"}`;
    const view: ChartViewProps = {
      title,
      data: zoom.window.data,
      series: settings.presentation.visibleSeries,
      currency,
      type: settings.presentation.type,
      pieSeries: settings.presentation.pieSeries,
      height: expanded ? Math.max(360, height) : height,
      labelFormatter,
      locale,
      labels,
      animate: !reducedMotion && zoom.window.size < 150,
    };

    return (
      <div className="min-w-0 space-y-4">
        <ChartToolbarTA
          id={explorerId}
          settings={settings}
          series={coloredSeries}
          currency={currency}
          labels={labels}
          expanded={expanded}
        />
        {settings.presentation.type === "table" && normalizedData.length > 0 ? (
          <ChartTableTA {...view} />
        ) : !hasValues ? (
          <StateTA
            title={labels.emptyTitle}
            description={labels.emptyDescription}
          />
        ) : settings.presentation.type === "pie" ? (
          <DistributionChartTA {...view} />
        ) : (
          <CartesianChartTA {...view} />
        )}
        <ChartZoomControlsTA
          id={explorerId}
          data={normalizedData}
          zoom={zoom}
          labels={labels}
          labelFormatter={labelFormatter}
        />
      </div>
    );
  };

  const explorer = renderExplorer(false);

  return (
    <>
      {embedded ? (
        explorer
      ) : (
        <PanelTA
          title={title}
          description={description}
          icon={ChartNoAxesCombined}
          className="min-w-0"
        >
          <div className="px-4 pb-5 sm:px-5 md:px-6">{explorer}</div>
        </PanelTA>
      )}
      <Dialog
        open={settings.presentation.expanded}
        onOpenChange={settings.actions.setExpanded}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-none p-4 sm:max-w-[min(1200px,calc(100%-3rem))] sm:p-6 motion-reduce:animate-none">
          <DialogHeader className="mb-5 pr-8 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {description ?? labels.expanded}
            </DialogDescription>
          </DialogHeader>
          {renderExplorer(true)}
        </DialogContent>
      </Dialog>
    </>
  );
};
