import type { ChartLabels } from "@/modules/charting/types";

// LOCALIZED LABELS
export const chartLabels: Record<"es" | "en", ChartLabels> = {
  es: {
    chartType: "Visualización",
    type: {
      line: "Líneas",
      area: "Área",
      bar: "Barras",
      pie: "Distribución",
      table: "Tabla",
    },
    expand: "Ampliar gráfico",
    expanded: "Vista ampliada",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    reset: "Restablecer",
    previous: "Desplazar atrás",
    next: "Desplazar adelante",
    rangeStart: "Inicio del zoom",
    rangeEnd: "Fin del zoom",
    shown: "Mostrando",
    of: "de",
    points: "datos",
    series: "Series visibles",
    pieSeries: "Medida de la distribución",
    missing: "Sin dato",
    emptyTitle: "Sin datos para mostrar",
    emptyDescription: "Prueba otro rango de fechas o una serie diferente.",
    pieUnavailable:
      "La distribución requiere valores positivos y no admite porcentajes ni valores negativos. Usa líneas, barras o la tabla para esta medida.",
    pieExplanation:
      "Distribución de una sola medida en el rango visible. Las etiquetas repetidas se suman; se omiten los valores sin dato.",
    label: "Fecha / categoría",
    total: "Total visible",
    tableDescription:
      "Valores exactos del rango visible. Sin dato significa que no existe un valor registrado; no equivale a cero.",
    hint: "Ajusta el rango para explorar el detalle. También puedes usar las flechas del teclado en los controles.",
    lastSeries: "Debe quedar al menos una serie visible",
    periodScope:
      "El zoom solo cambia la visualización; las métricas conservan el período seleccionado.",
  },
  en: {
    chartType: "Visualization",
    type: {
      line: "Lines",
      area: "Area",
      bar: "Bars",
      pie: "Distribution",
      table: "Table",
    },
    expand: "Expand chart",
    expanded: "Expanded view",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    previous: "Move backward",
    next: "Move forward",
    rangeStart: "Zoom start",
    rangeEnd: "Zoom end",
    shown: "Showing",
    of: "of",
    points: "data points",
    series: "Visible series",
    pieSeries: "Distribution measure",
    missing: "No data",
    emptyTitle: "No data to display",
    emptyDescription: "Try another date range or a different series.",
    pieUnavailable:
      "Distribution requires positive values and does not support percentages or negative values. Use lines, bars or the table for this measure.",
    pieExplanation:
      "Distribution of a single measure in the visible range. Repeated labels are added together; missing values are omitted.",
    label: "Date / category",
    total: "Visible total",
    tableDescription:
      "Exact values in the visible range. No data means that no value was recorded; it does not mean zero.",
    hint: "Adjust the range to explore details. You can also use the arrow keys on the controls.",
    lastSeries: "At least one series must remain visible",
    periodScope:
      "Zoom only changes the visualization; metrics keep the selected period.",
  },
};
