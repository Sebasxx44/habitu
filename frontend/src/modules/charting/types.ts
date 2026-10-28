// DATA CONTRACTS
export type ChartType = "line" | "area" | "bar" | "pie" | "table";
export type ChartValueFormat = "number" | "currency" | "percent";

export interface ChartDatum {
  label: string;
  values: Record<string, number | null>;
}

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
  format?: ChartValueFormat;
}

export interface InteractiveChartProps {
  title: string;
  description?: string;
  data: ChartDatum[];
  series: ChartSeries[];
  currency?: string;
  initialType?: ChartType;
  allowedTypes?: ChartType[];
  labelFormatter?: (label: string) => string;
  height?: number;
  embedded?: boolean;
}

export interface ChartSlice {
  label: string;
  value: number;
}

export interface ChartRange {
  start: number;
  end: number;
}

// COMPOSABLE CONTRACTS
export interface ChartZoomResult {
  window: {
    range: ChartRange;
    data: ChartDatum[];
    size: number;
    total: number;
    isZoomed: boolean;
    canZoomIn: boolean;
    canMoveBack: boolean;
    canMoveForward: boolean;
  };
  actions: {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    moveBack: () => void;
    moveForward: () => void;
    setStart: (index: number) => void;
    setEnd: (index: number) => void;
  };
}

export interface ChartPresentationResult {
  presentation: {
    type: ChartType;
    types: ChartType[];
    visibleSeries: ChartSeries[];
    pieSeries: ChartSeries | undefined;
    expanded: boolean;
  };
  actions: {
    setType: (type: ChartType) => void;
    toggleSeries: (key: string) => void;
    selectPieSeries: (key: string) => void;
    setExpanded: (expanded: boolean) => void;
  };
}

// PRESENTATION CONTRACTS
export interface ChartLabels {
  chartType: string;
  type: Record<ChartType, string>;
  expand: string;
  expanded: string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  previous: string;
  next: string;
  rangeStart: string;
  rangeEnd: string;
  shown: string;
  of: string;
  points: string;
  series: string;
  pieSeries: string;
  missing: string;
  emptyTitle: string;
  emptyDescription: string;
  pieUnavailable: string;
  pieExplanation: string;
  label: string;
  total: string;
  tableDescription: string;
  hint: string;
  lastSeries: string;
  periodScope: string;
}

export interface ChartViewProps {
  title: string;
  data: ChartDatum[];
  series: ChartSeries[];
  currency: string;
  type: ChartType;
  pieSeries: ChartSeries | undefined;
  height: number;
  labelFormatter: (label: string) => string;
  locale: string;
  labels: ChartLabels;
  animate: boolean;
}
