/* global EventTarget, AbortController */
import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";

// FIXTURES
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};
globalThis.window = Object.assign(new EventTarget(), {
  location: { pathname: "/cliente/explore", href: "" },
});
const calls = [];
axios.defaults.adapter = async (config) => {
  calls.push(config);
  const data = config.url.includes("availability")
    ? { timezone: "America/Bogota", slots: [] }
    : {
        id: 5,
        name: "Estudio",
        branches: [
          { id: 9, name: "Sede", address: "Pereira", is_main_branch: true },
        ],
      };
  return {
    status: 200,
    statusText: "OK",
    headers: {},
    config,
    data: { success: true, data },
  };
};
const { publicBusinessService } =
  await import("@/services/business/publicBusinessService");
const { bookingAvailabilityService } =
  await import("@/services/booking/availabilityService");
const selection = {
  business_id: 5,
  branch_id: 9,
  service_id: 7,
  date: "2026-11-03",
};

// TESTS
test("el detalle del catálogo consulta el contrato público sin una sesión inventada", async () => {
  const profile = await publicBusinessService.getById(5);
  const request = calls.at(-1);
  assert.equal(request.url, "/v2/public/businesses/5");
  assert.equal(request.headers.has("Authorization"), false);
  assert.equal(profile.main_branch.id, 9);
  assert.equal(profile.address, "Pereira");
});

test("una reserva nueva consulta horarios públicos sin leer datos de clientes", async () => {
  const result = await bookingAvailabilityService.get(
    selection,
    new AbortController().signal,
  );
  const request = calls.at(-1);
  assert.equal(request.url, "/v2/public/availability");
  assert.equal(request.headers.has("Authorization"), false);
  assert.deepEqual(request.params, selection);
  assert.deepEqual(result.slots, []);
});

test("reprogramar una cita mantiene la consulta de disponibilidad protegida", async () => {
  await bookingAvailabilityService.get(
    { ...selection, appointment_id: 81 },
    new AbortController().signal,
  );
  const request = calls.at(-1);
  assert.equal(request.url, "/v2/appointments/availability");
  assert.equal(request.params.appointment_id, 81);
});
