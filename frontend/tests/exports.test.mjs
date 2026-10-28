import assert from "node:assert/strict";
import test from "node:test";
import { exportReportCsv } from "@/modules/reports/exports";
import { downloadBookingCalendar } from "@/composables/booking/calendar";

const captureDownload = async (action) => {
  const originalDocument = globalThis.document;
  const originalCreateUrl = URL.createObjectURL;
  const originalRevokeUrl = URL.revokeObjectURL;
  let captured;
  let clicked = false;
  globalThis.document = {
    createElement: () => ({
      click: () => {
        clicked = true;
      },
    }),
  };
  URL.createObjectURL = (blob) => {
    captured = blob;
    return "blob:test";
  };
  URL.revokeObjectURL = () => {};
  try {
    action();
    assert(clicked);
    return await captured.text();
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateUrl;
    URL.revokeObjectURL = originalRevokeUrl;
  }
};

test("CSV neutraliza fórmulas y conserva importes y comillas del cliente", async () => {
  const csv = await captureDownload(() =>
    exportReportCsv(
      { currency: "COP", period: { start: "2026-10-01", end: "2026-10-03" } },
      [
        {
          fecha: "2026-10-03",
          hora: "10:00",
          cliente: '=HYPERLINK("https://example.test")',
          barbero: "María, Sol",
          servicio: "Corte",
          estado: "COMPLETED",
          sucursal: "Norte",
          currency: "COP",
          valor_servicio: 25000,
          descuento: 0,
          valor_final: 25000,
          total_pagado: 10000,
          metodo_pago: "WALLET",
        },
      ],
    ),
  );
  assert(csv.includes('"\'=HYPERLINK(""https://example.test"")"'));
  assert(csv.includes('"María, Sol"'));
  assert(csv.includes('"25000","0","25000","10000"'));
});

test("calendario conserva la zona horaria y escapa saltos del título sin inyectar eventos", async () => {
  const ics = await captureDownload(() =>
    downloadBookingCalendar(
      4,
      "2026-10-03",
      "15:30",
      45,
      "Corte\r\nEND:VEVENT\rBEGIN:VEVENT",
      "America/Bogota",
    ),
  );
  assert(ics.includes("DTSTART;TZID=America/Bogota:20261003T153000"));
  assert(ics.includes("DURATION:PT45M"));
  assert.equal(
    ics.split("\r\n").filter((line) => line === "BEGIN:VEVENT").length,
    1,
  );
  assert(ics.includes("SUMMARY:Corte\\nEND:VEVENT\\nBEGIN:VEVENT"));
});
