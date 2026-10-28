import assert from "node:assert/strict";
import test from "node:test";
import {
  availableChartTypes,
  canUsePie,
  chartHasValues,
  chartSlices,
  chartValue,
  clampChartRange,
  formatChartValue,
  fullChartRange,
  moveChartRange,
  normalizeChartData,
  resizeChartRange,
  toggleChartSeries,
  visibleChartSeries,
} from "@/modules/charting/models";

// RANGE BEHAVIOR
test("el zoom conserva los límites inclusivos y vuelve al período completo", () => {
  const full = fullChartRange(31);
  const closer = resizeChartRange(full, 31, "in");
  assert.equal(closer.end - closer.start + 1, 16);
  assert.equal((closer.start + closer.end) / 2, 14.5);
  assert.deepEqual(resizeChartRange(closer, 31, "out"), full);
  assert.deepEqual(resizeChartRange(fullChartRange(1), 1, "in"), {
    start: 0,
    end: 0,
  });
  assert.deepEqual(fullChartRange(0), { start: 0, end: 0 });
  assert.deepEqual(resizeChartRange({ start: 3, end: 3 }, 31, "in"), {
    start: 3,
    end: 3,
  });
});

test("desplazarse cerca del límite conserva el tamaño del zoom sin perder el último dato", () => {
  const range = { start: 3, end: 8 };
  assert.deepEqual(moveChartRange(range, 10, "forward"), { start: 4, end: 9 });
  assert.deepEqual(moveChartRange({ start: 4, end: 9 }, 10, "forward"), {
    start: 4,
    end: 9,
  });
  assert.deepEqual(moveChartRange({ start: 1, end: 6 }, 10, "back"), {
    start: 0,
    end: 5,
  });
  assert.deepEqual(clampChartRange({ start: 50, end: 80 }, 4), {
    start: 3,
    end: 3,
  });
  assert.deepEqual(clampChartRange({ start: -10, end: 3 }, 10), {
    start: 0,
    end: 3,
  });
});

// MISSING VALUES AND MEASURES
test("cero es actividad válida y los datos ausentes o no finitos conservan su ausencia", () => {
  const series = [
    { key: "bookings", label: "Reservas" },
    { key: "revenue", label: "Ingresos", format: "currency" },
  ];
  const data = [
    { label: "2026-10-01", values: { bookings: 0, revenue: null } },
    { label: "2026-10-02", values: { bookings: Infinity, revenue: NaN } },
    { label: "2026-10-03", values: {} },
  ];
  const normalized = normalizeChartData(data, series);
  assert.deepEqual(
    normalized.map(({ values }) => values),
    [
      { bookings: 0, revenue: null },
      { bookings: null, revenue: null },
      { bookings: null, revenue: null },
    ],
  );
  assert.equal(chartHasValues(normalized, series), true);
  assert.equal(chartHasValues(normalized, [series[1]]), false);
  assert.equal(chartValue(undefined), null);
  assert.equal(formatChartValue(null), "Sin dato");
  assert.equal(formatChartValue(0), "0");
  assert.equal(data[1].values.bookings, Infinity);
});

test("la distribución suma etiquetas de una sola medida sin sumar ingresos con reservas", () => {
  const data = [
    { label: "Corte", values: { bookings: 2, revenue: 120000 } },
    { label: "Barba", values: { bookings: 1, revenue: 30000 } },
    { label: "Corte", values: { bookings: 3, revenue: null } },
    { label: "Sin registro", values: { bookings: null, revenue: null } },
    { label: "Sin reservas", values: { bookings: 0, revenue: 0 } },
  ];
  assert.deepEqual(chartSlices(data, "bookings"), [
    { label: "Corte", value: 5 },
    { label: "Barba", value: 1 },
    { label: "Sin reservas", value: 0 },
  ]);
  assert.deepEqual(chartSlices(data, "revenue"), [
    { label: "Corte", value: 120000 },
    { label: "Barba", value: 30000 },
    { label: "Sin reservas", value: 0 },
  ]);
});

test("la distribución evita convertir porcentajes, negativos o valores nulos en proporciones engañosas", () => {
  const series = { key: "value", label: "Medida" };
  const datum = (value) => ({ label: "Dato", values: { value } });
  assert.equal(canUsePie([datum(2), datum(0), datum(null)], series), true);
  assert.equal(canUsePie([datum(0), datum(null)], series), false);
  assert.equal(canUsePie([datum(2), datum(-1)], series), false);
  assert.equal(canUsePie([datum(30)], { ...series, format: "percent" }), false);
  assert.equal(canUsePie([datum(Infinity)], series), false);
});

// PRESENTATION BEHAVIOR
test("la leyenda siempre conserva una serie visible incluso al cambiar las medidas disponibles", () => {
  const series = [
    { key: "current", label: "Actual" },
    { key: "previous", label: "Anterior" },
  ];
  let hidden = toggleChartSeries(series, [], "previous");
  assert.deepEqual(visibleChartSeries(series, hidden), [series[0]]);
  hidden = toggleChartSeries(series, hidden, "current");
  assert.deepEqual(hidden, ["previous"]);
  hidden = toggleChartSeries(series, hidden, "previous");
  assert.deepEqual(hidden, []);
  assert.deepEqual(toggleChartSeries(series, hidden, "missing"), []);
  assert.deepEqual(visibleChartSeries([series[1]], ["previous"]), [series[1]]);
  assert.deepEqual(visibleChartSeries([], []), []);
});

test("la tabla accesible permanece disponible con cualquier configuración de gráficos", () => {
  assert.deepEqual(availableChartTypes(["bar", "bar"]), ["bar", "table"]);
  assert.deepEqual(availableChartTypes([]), ["table"]);
  assert.deepEqual(availableChartTypes(["table"]), ["table"]);
});

test("el formato conserva unidades monetarias, porcentajes y decimales sin multiplicar porcentajes", () => {
  assert.match(
    formatChartValue(1250.5, "currency", "USD", "en-US"),
    /USD.*1,250\.5/,
  );
  assert.equal(formatChartValue(25.5, "percent", "COP", "en-US"), "25.5%");
  assert.equal(formatChartValue(-4, "number", "COP", "en-US"), "-4");
  assert.equal(
    formatChartValue(null, "currency", "COP", "en-US", "No data"),
    "No data",
  );
});
