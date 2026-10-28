import assert from "node:assert/strict";
import test from "node:test";
import {
  isBookingDate,
  isBookingTime,
  resolveBookingContext,
} from "@/composables/booking/context";

const business = {
  id: 1,
  name: "Estudio",
  uses_professionals: true,
  uses_resources: false,
};
const branches = [
  { id: 10, is_active: true, is_main_branch: true },
  { id: 11, is_active: true },
];
const professionals = [
  {
    id: 30,
    name: "Ana",
    is_active: true,
    branch_ids: [10],
    services: [{ id: 20 }],
  },
];
const services = [
  {
    id: 20,
    name: "Servicio",
    is_active: true,
    requires_professional: true,
    professionals,
  },
];
const resolve = (context, overrides = {}) =>
  resolveBookingContext(
    { ...business, ...overrides },
    services,
    professionals,
    [],
    branches,
    context,
    "2026-10-03",
  );

test("un enlace conserva servicio, profesional, sede y horario pero solamente llega al resumen", () => {
  const result = resolve({
    serviceId: 20,
    professionalId: 30,
    branchId: 10,
    date: "2026-10-05",
    time: "14:30",
    durationMinutes: 30,
    participants: 1,
  });
  assert.deepEqual(result.selection, {
    serviceId: 20,
    professionalId: 30,
    branchId: 10,
    resourceId: null,
    durationMinutes: 30,
    participants: 1,
    date: "2026-10-05",
    time: "14:30",
  });
  assert.equal(result.step, "review");
  assert.equal(result.notice, null);
});

test("cualquier profesional conserva la selección automática para disponibilidad del backend", () => {
  const result = resolve({
    serviceId: 20,
    branchId: 10,
    date: "2026-10-05",
    time: "14:30",
  });
  assert.equal(result.selection.professionalId, null);
  assert.equal(result.step, "review");
});

test("un profesional ajeno a la sede invalida el horario del enlace y solicita selección explícita", () => {
  const result = resolve({
    serviceId: 20,
    professionalId: 30,
    branchId: 11,
    date: "2026-10-05",
    time: "14:30",
  });
  assert.equal(result.selection.professionalId, null);
  assert.equal(result.selection.time, "");
  assert.equal(result.step, "professional");
  assert(result.notice);
});

test("fechas inexistentes, pasadas y horas inválidas no llegan al resumen", () => {
  assert.equal(isBookingDate("2026-02-30"), false);
  assert.equal(isBookingDate("2028-02-29"), true);
  assert.equal(isBookingTime("24:01"), false);
  assert.equal(isBookingTime("14:60"), false);
  for (const context of [
    { date: "2026-02-30", time: "14:30" },
    { date: "2026-10-02", time: "14:30" },
    { date: "2026-10-05", time: "99:99" },
  ]) {
    const result = resolve({ serviceId: 20, ...context });
    assert.notEqual(result.step, "review");
    assert.equal(result.selection.time, "");
    assert(result.notice);
  }
});

test("un servicio retirado o un espacio sin seleccionar no omiten los pasos requeridos", () => {
  assert.equal(
    resolve({ serviceId: 999, date: "2026-10-05", time: "14:30" }).step,
    "service",
  );
  assert.equal(
    resolve(
      { serviceId: 20, date: "2026-10-05", time: "14:30" },
      { uses_resources: true },
    ).step,
    "professional",
  );
});

test("entrar desde el perfil de un profesional conserva su preferencia al elegir servicio", () => {
  const result = resolve({ professionalId: 30 });
  assert.equal(result.selection.professionalId, 30);
  assert.equal(result.step, "service");
});
