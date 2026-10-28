import assert from "node:assert/strict";
import test from "node:test";
import {
  dateRangeParams,
  rangeForPreset,
  sameDateRange,
  validDateRange,
} from "@/modules/analytics/dateRange";

test("los accesos rápidos incluyen ambos extremos y atraviesan meses sin depender de la zona del equipo", () => {
  assert.deepEqual(rangeForPreset("7", "2026-03-03"), {
    preset: "7",
    start: "2026-02-25",
    end: "2026-03-03",
  });
  assert.deepEqual(rangeForPreset("30", "2024-03-01"), {
    preset: "30",
    start: "2024-02-01",
    end: "2024-03-01",
  });
  assert.equal(rangeForPreset("365", "2024-12-31").start, "2024-01-02");
});

test("el rango personalizado envía fechas exactas, sin conservar días del acceso rápido anterior", () => {
  const value = { preset: "custom", start: "2026-08-03", end: "2026-08-11" };
  assert.deepEqual(dateRangeParams(value), {
    start_date: "2026-08-03",
    end_date: "2026-08-11",
  });
  assert.deepEqual(dateRangeParams(rangeForPreset("90", "2026-10-04")), {
    days: "90",
  });
});

test("editar fechas permite un único día, pero rechaza rangos incompletos, invertidos, futuros o de más de 366 días", () => {
  const range = (start, end) => ({ preset: "custom", start, end });
  assert.equal(
    validDateRange(range("2026-10-04", "2026-10-04"), "2026-10-04"),
    true,
  );
  for (const [start, end] of [
    ["", "2026-10-04"],
    ["2026-10-04", "2026-09-04"],
    ["2026-10-04", "2026-10-05"],
    ["2026-02-30", "2026-03-04"],
    ["2025-10-03", "2026-10-04"],
  ]) {
    assert.equal(validDateRange(range(start, end), "2026-10-04"), false);
  }
  assert.equal(
    sameDateRange(
      range("2026-10-01", "2026-10-04"),
      range("2026-10-01", "2026-10-04"),
    ),
    true,
  );
  assert.equal(
    sameDateRange(
      range("2026-10-01", "2026-10-04"),
      range("2026-10-01", "2026-10-03"),
    ),
    false,
  );
});
