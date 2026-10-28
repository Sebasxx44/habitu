import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsQuery,
  validAnalyticsRange,
} from "@/modules/analytics/period";
import { analyticsCsv, analyticsCsvCell } from "@/modules/analytics/exports";

test("el período personalizado valida calendario, límite inclusivo y evita fechas futuras", () => {
  assert.equal(
    validAnalyticsRange("2026-01-01", "2026-10-03", "2026-10-03"),
    true,
  );
  assert.equal(
    validAnalyticsRange("2026-10-03", "2026-10-01", "2026-10-03"),
    false,
  );
  assert.equal(
    validAnalyticsRange("2026-02-30", "2026-03-01", "2026-10-03"),
    false,
  );
  assert.equal(
    validAnalyticsRange("2025-01-01", "2026-10-03", "2026-10-03"),
    false,
  );
  assert.equal(
    validAnalyticsRange("2026-10-01", "2026-10-04", "2026-10-03"),
    false,
  );
  assert.equal(
    validAnalyticsRange("2024-01-01", "2024-12-31", "2026-10-03"),
    true,
  );
});

test("filtros envían moneda y agrupación sin mezclar preset con fechas personalizadas", () => {
  const custom = analyticsQuery({
    preset: "custom",
    start: "2026-10-01",
    end: "2026-10-03",
    currency: "USD",
    grain: "month",
  });
  assert.equal(custom.get("days"), null);
  assert.equal(custom.get("start_date"), "2026-10-01");
  assert.equal(custom.get("currency"), "USD");
  const preset = analyticsQuery({
    preset: "365",
    start: "2026-10-01",
    end: "2026-10-03",
    currency: "COP",
    grain: "quarter",
  });
  assert.equal(preset.get("start_date"), null);
  assert.equal(preset.get("days"), "365");
});

test("CSV exporta el período consultado, valores nulos y definiciones sin fórmulas inyectadas", () => {
  assert.equal(analyticsCsvCell("=SUM(1,2)"), '"\'=SUM(1,2)"');
  assert.equal(analyticsCsvCell(-12), '"-12"');
  const csv = analyticsCsv(
    {
      scope: { name: "@negocio" },
      period: { start: "2026-10-01", end: "2026-10-03" },
      currency: "USD",
      metrics: [{ id: "occupancy", value: null, previous: null, change: null }],
      platform: null,
      series: [
        {
          date: "2026-10-01",
          reservations: 1,
          completed: 1,
          cancelled: 0,
          revenue: 20,
          previousReservations: 0,
          previousRevenue: 0,
        },
      ],
    },
    (key) => key,
  );
  assert(csv.includes('"\'@negocio"'));
  assert(csv.includes('"metric.occupancy","","","","definition.occupancy"'));
  assert(csv.includes('"currency","USD"'));
  assert(csv.includes('"2026-10-01","1","1","0","20","0","0"'));
});
