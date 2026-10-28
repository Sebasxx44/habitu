import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { bookingResumePath } from "@/composables/booking/resumePath";
import { resolveBookingContext } from "@/composables/booking/context";

// FIXTURES
const business = { id: 5, name: "Estudio", uses_professionals: false };
const services = [
  {
    id: 7,
    name: "Sala",
    booking_model: "resource",
    resources: [{ id: 11 }],
    duration: 60,
    duration_mode: "selectable",
    duration_options: [60, 120],
  },
];
const branches = [{ id: 9, is_main_branch: true }];
const resources = [{ id: 11, branch_id: 9 }];

// TESTS
test("el acceso conserva la selección pública y vuelve al resumen sin confirmar", () => {
  const path = bookingResumePath(5, {
    serviceId: 7,
    branchId: 9,
    resourceId: 11,
    date: "2026-11-03",
    time: "14:30",
    durationMinutes: 120,
    participants: 1,
    promoCode: " PLAN&20 ",
    source: "express",
  });
  const url = new URL(path, "https://habitu.test");
  assert.equal(url.pathname, "/cliente/business/5");
  assert.equal(url.searchParams.get("book"), "1");
  assert.equal(url.searchParams.get("promo_code"), "PLAN&20");
  assert.equal(url.searchParams.get("source"), "express");
  const result = resolveBookingContext(
    business,
    services,
    [],
    resources,
    branches,
    {
      serviceId: Number(url.searchParams.get("service_id")),
      branchId: Number(url.searchParams.get("branch_id")),
      resourceId: Number(url.searchParams.get("resource_id")),
      date: url.searchParams.get("date"),
      time: url.searchParams.get("time"),
      durationMinutes: Number(url.searchParams.get("duration_minutes")),
      participants: Number(url.searchParams.get("participants")),
    },
    "2026-10-28",
  );
  assert.equal(result.step, "review");
  assert.deepEqual(result.selection, {
    serviceId: 7,
    branchId: 9,
    professionalId: null,
    resourceId: 11,
    date: "2026-11-03",
    time: "14:30",
    durationMinutes: 120,
    participants: 1,
  });
  assert.equal(url.searchParams.has("confirm"), false);
});

test("volver de autenticar revalida recursos retirados y fechas vencidas", () => {
  const result = resolveBookingContext(
    business,
    services,
    [],
    [],
    branches,
    {
      serviceId: 7,
      branchId: 9,
      resourceId: 11,
      date: "2026-10-27",
      time: "14:30",
    },
    "2026-10-28",
  );
  assert.notEqual(result.step, "review");
  assert.equal(result.selection.time, "");
  assert.equal(result.selection.resourceId, null);
  assert(result.notice);
});

test("el retorno sólo incluye IDs válidos, selección pública y un destino local fijo", () => {
  const path = bookingResumePath(5, {
    serviceId: -1,
    branchId: Number.NaN,
    resourceId: 1.5,
    date: "2026-02-30",
    time: "25:30",
    promoCode: "x".repeat(100),
    notes: "private note",
    returnTo: "https://external.test",
    token: "private-token",
  });
  const url = new URL(path, "https://habitu.test");
  assert.equal(url.pathname, "/cliente/business/5");
  assert.deepEqual([...url.searchParams.keys()], ["book", "promo_code"]);
  assert.equal(url.searchParams.get("promo_code").length, 80);
  assert.equal(bookingResumePath(-1, {}), "/cliente/explore");
});
