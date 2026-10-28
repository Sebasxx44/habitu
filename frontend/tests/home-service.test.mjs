import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_SERVICE_NEXT_STATUS,
  canCancelHomeService,
  formatHomeServicePrice,
  homeServiceDescription,
  homeServiceDistance,
  homeServicePoint,
  isHomeServiceActive,
  isHomeServiceExpired,
  validateHomeService,
} from "@/modules/home-service/helpers";
import { homeServiceMetrics } from "@/modules/home-service/analytics";

const form = {
  category: "haircut",
  description: "Corte de cabello corto",
  address: "Bogotá, Calle 12 # 4-56",
  instructions: "Piso 2",
};
const request = (overrides = {}) => ({
  id: 1,
  request_code: "OD-TEST",
  status: "SEARCHING",
  description: null,
  client_address: "Calle 1",
  professional_id: null,
  professional: null,
  professional_lat: null,
  professional_lng: null,
  estimated_price: null,
  completed_at: null,
  created_at: "2026-10-03T15:00:00Z",
  ...overrides,
});

test("domicilios rechaza coordenadas ausentes e inválidas y conserva cero como coordenada válida", () => {
  assert.equal(homeServicePoint(null, -74), null);
  assert.equal(homeServicePoint("", ""), null);
  assert.equal(homeServicePoint("n/a", -74), null);
  assert.equal(homeServicePoint(91, 10), null);
  assert.equal(homeServicePoint(5, -181), null);
  assert.deepEqual(homeServicePoint("0", "0"), { lat: 0, lng: 0 });
  assert.deepEqual(validateHomeService(form, { lat: 4.6, lng: -74.1 }), {});
  assert.match(validateHomeService(form, null).location, /ubicación/);
});

test("domicilios valida dirección, categoría y longitudes dentro del contrato del servidor", () => {
  assert.ok(
    validateHomeService(
      { ...form, category: "una-categoria-falsa" },
      { lat: 0, lng: 0 },
    ).category,
  );
  assert.ok(
    validateHomeService({ ...form, description: "   " }, { lat: 0, lng: 0 })
      .description,
  );
  assert.ok(
    validateHomeService({ ...form, address: "   " }, { lat: 0, lng: 0 })
      .address,
  );
  assert.ok(
    validateHomeService(
      { ...form, description: "a".repeat(1401) },
      { lat: 0, lng: 0 },
    ).description,
  );
  assert.ok(
    validateHomeService(
      { ...form, instructions: "a".repeat(351) },
      { lat: 0, lng: 0 },
    ).instructions,
  );
  const maximumForm = {
    ...form,
    description: "a".repeat(1400),
    instructions: "b".repeat(350),
  };
  assert.ok(homeServiceDescription(maximumForm).length < 2000);
  assert.match(homeServiceDescription(form), /Indicaciones de acceso: Piso 2/);
});

test("domicilios distingue precio pendiente, cero válido y valor final real", () => {
  assert.equal(formatHomeServicePrice(null), "Por confirmar");
  assert.equal(formatHomeServicePrice(""), "Por confirmar");
  assert.equal(formatHomeServicePrice("error"), "Por confirmar");
  assert.notEqual(formatHomeServicePrice(0), "Por confirmar");
  assert.match(formatHomeServicePrice("58000"), /58[.,]000/);
});

test("domicilios solo vence búsquedas y restringe cambios a la secuencia operativa", () => {
  const now = new Date("2026-10-03T15:10:00Z").getTime();
  assert.equal(
    isHomeServiceExpired(
      request({ search_expires_at: "2026-10-03T15:05:00Z" }),
      now,
    ),
    true,
  );
  assert.equal(
    isHomeServiceExpired(
      request({
        status: "ACCEPTED",
        search_expires_at: "2026-10-03T15:05:00Z",
      }),
      now,
    ),
    false,
  );
  assert.equal(
    isHomeServiceExpired(request({ search_expires_at: null }), now),
    false,
  );
  assert.equal(canCancelHomeService(request({ status: "IN_PROGRESS" })), false);
  assert.equal(canCancelHomeService(request({ status: "ON_THE_WAY" })), true);
  assert.equal(isHomeServiceActive(request({ status: "COMPLETED" })), false);
  assert.equal(HOME_SERVICE_NEXT_STATUS.ACCEPTED, "ON_THE_WAY");
  assert.equal(HOME_SERVICE_NEXT_STATUS.ON_THE_WAY, "IN_PROGRESS");
  assert.equal(HOME_SERVICE_NEXT_STATUS.COMPLETED, undefined);
});

test("analítica domicilios no suma estimados ni mezcla monedas y calcula finalización sobre cierres", () => {
  const metrics = homeServiceMetrics(
    [
      request({
        id: 1,
        status: "COMPLETED",
        final_price: "100000",
        estimated_price: "999999",
        currency: "COP",
        completed_at: "2026-10-03T18:00:00Z",
        accepted_at: "2026-10-03T15:04:00Z",
      }),
      request({
        id: 2,
        status: "COMPLETED",
        final_price: "25",
        currency: "USD",
        completed_at: "2026-10-03T19:00:00Z",
      }),
      request({
        id: 3,
        status: "COMPLETED",
        final_price: null,
        estimated_price: 50000,
      }),
      request({ id: 4, status: "CANCELLED", final_price: 100000 }),
      request({
        id: 5,
        estimated_price: "50000",
        search_expires_at: "2026-10-03T15:05:00Z",
      }),
    ],
    new Date("2026-10-03T20:00:00Z"),
  );
  assert.deepEqual(metrics.finalRevenue, [
    { currency: "COP", amount: 100000 },
    { currency: "USD", amount: 25 },
  ]);
  assert.equal(metrics.active, 1);
  assert.equal(metrics.completed, 3);
  assert.equal(metrics.completionRate, 75);
  assert.equal(metrics.averageAcceptanceMinutes, 4);
  assert.equal(metrics.expired, 1);
});

test("analítica usa días de Bogotá y fecha de finalización para los servicios completados", () => {
  const metrics = homeServiceMetrics(
    [
      request({
        status: "COMPLETED",
        created_at: "2026-10-03T04:30:00Z",
        completed_at: "2026-10-03T06:00:00Z",
      }),
    ],
    new Date("2026-10-04T02:00:00Z"),
  );
  assert.equal(metrics.daily.length, 7);
  assert.equal(metrics.daily.at(-1).date, "2026-10-03");
  assert.equal(metrics.daily.at(-1).created, 0);
  assert.equal(metrics.daily.at(-1).completed, 1);
  assert.equal(metrics.daily.at(-2).created, 1);
  assert.equal(
    homeServiceMetrics([], new Date("2026-10-03T20:00:00Z")).completionRate,
    null,
  );
});

test("distancia a domicilio maneja puntos iguales y antípodas sin ETA fabricado", () => {
  assert.equal(homeServiceDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(
    Number.isFinite(
      homeServiceDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }),
    ),
  );
  assert.ok(
    homeServiceDistance({ lat: 4.6, lng: -74.1 }, { lat: 4.7, lng: -74.1 }) >
      10,
  );
});
