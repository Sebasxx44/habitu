import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";

// TEST CONTEXT
const translations = createInstance();
await translations.init({
  lng: "es",
  fallbackLng: "es",
  resources: { es: { translation: { common: { close: "Cerrar" } } } },
});

const renderChart = (props) =>
  renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n: translations },
      createElement(InteractiveChartTA, props),
    ),
  );

// REGRESSIONS
test("un gráfico vacío no entrega etiquetas inválidas a un formateador de fecha estricto", () => {
  const formatted = [];
  const formatter = new Intl.DateTimeFormat("es-CO");
  const labelFormatter = (label) => {
    formatted.push(label);
    return formatter.format(new Date(`${label}T12:00:00Z`));
  };
  assert.throws(() => labelFormatter(""), RangeError);
  formatted.length = 0;

  const markup = renderChart({
    title: "Reservas diarias",
    data: [],
    series: [{ key: "reservations", label: "Reservas" }],
    labelFormatter,
  });

  assert.deepEqual(formatted, []);
  assert.match(markup, /role="status"/);
  assert.match(markup, /Sin datos para mostrar/);
  assert.doesNotMatch(markup, /type="range"/);
});

test("la tabla renderizada conserva cero, ausencia de datos, moneda y encabezados accesibles", () => {
  const markup = renderChart({
    title: "Servicios realizados",
    initialType: "table",
    data: [
      { label: "2026-10-01", values: { reservations: 0, revenue: null } },
      { label: "2026-10-02", values: { reservations: null, revenue: 1250 } },
    ],
    series: [
      { key: "reservations", label: "Reservas" },
      { key: "revenue", label: "Valor realizado", format: "currency" },
    ],
    currency: "COP",
  });

  assert.match(markup, /<table[^>]*>/);
  assert.match(markup, /<caption[^>]*>/);
  assert.match(markup, /<th scope="col"[^>]*>Valor realizado · COP<\/th>/);
  assert.match(markup, /<th scope="row"[^>]*>2026-10-01<\/th>/);
  assert.match(markup, /<td[^>]*>0<\/td>/);
  assert.equal((markup.match(/<td[^>]*>Sin dato<\/td>/g) ?? []).length, 2);
  assert.match(markup, /<td[^>]*>COP\s*1\.250<\/td>/);
  assert.match(
    markup,
    /role="region" aria-label="Servicios realizados · Tabla" tabindex="0"/,
  );
});

test("un tipo inicial no permitido cae en uno habilitado y siempre ofrece tabla accesible", () => {
  const markup = renderChart({
    title: "Reservas",
    initialType: "pie",
    allowedTypes: ["bar"],
    data: [{ label: "Octubre", values: { count: 2 } }],
    series: [{ key: "count", label: "Total" }],
  });

  assert.match(markup, /aria-pressed="true"[^>]*>Barras<\/button>/);
  assert.match(markup, /aria-pressed="false"[^>]*>Tabla<\/button>/);
  assert.doesNotMatch(markup, />Distribución<\/button>/);
  assert.doesNotMatch(markup, />Líneas<\/button>/);
  assert.match(markup, /aria-label="Ampliar gráfico"/);
});

test("la distribución renderizada usa una sola unidad y agrupa categorías repetidas", () => {
  const markup = renderChart({
    title: "Servicios",
    initialType: "pie",
    data: [
      { label: "Corte", values: { reservations: 2, revenue: 70000 } },
      { label: "Corte", values: { reservations: 3, revenue: 120000 } },
    ],
    series: [
      { key: "reservations", label: "Reservas" },
      { key: "revenue", label: "Valor realizado", format: "currency" },
    ],
    currency: "COP",
  });

  assert.match(markup, /Medida de la distribución/);
  assert.match(
    markup,
    /<option value="reservations" selected="">Reservas<\/option>/,
  );
  assert.match(
    markup,
    /<option value="revenue">Valor realizado · COP<\/option>/,
  );
  const distribution = markup.match(
    /<ul[^>]*aria-label="Distribución"[^>]*>(.*?)<\/ul>/,
  )?.[1];
  assert.ok(distribution);
  assert.equal((distribution.match(/<li /g) ?? []).length, 1);
  assert.match(distribution, />Corte<\/span>/);
  assert.match(distribution, />5<span/);
  assert.match(distribution, />100%<\/span>/);
  assert.doesNotMatch(distribution, /COP|190\.000|70\.000|120\.000/);
});
