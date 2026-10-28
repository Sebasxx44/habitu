import assert from "node:assert/strict";
import test from "node:test";
import {
  discoveryNavigationState,
  readDiscoveryNavigationState,
} from "@/modules/discovery/services/discoveryReturn";
import { routeScrollPlan } from "@/composables/layout/scrollPolicy";

// TEST CONTEXT
const origin = {
  pathname: "/cliente/explore",
  search: "?category_id=4&zone=Pereira&page=2",
  hash: "#discovery-business-7",
  key: "catalog-key",
};

// REGRESSIONS
test("el retorno conserva URL completa y key del catálogo para restaurar su scroll mediante POP", () => {
  const state = discoveryNavigationState(origin);
  assert.deepEqual(readDiscoveryNavigationState(state), {
    discoveryOrigin: origin,
  });
  assert.notEqual(state.discoveryOrigin, origin);
  const positions = new Map([[origin.key, { left: 0, top: 860 }]]);
  const detail = {
    pathname: "/cliente/business/7",
    search: "?book=1&service_id=12",
    hash: "",
    key: "profile-key",
  };
  assert.deepEqual(
    routeScrollPlan(
      detail,
      state.discoveryOrigin,
      "POP",
      positions.get(origin.key),
    ),
    { kind: "position", position: { left: 0, top: 860 } },
  );
});

test("sólo un origen de descubrimiento explícito habilita volver por historial", () => {
  for (const pathname of [
    "/cliente/explore",
    "/cliente/on-demand",
    "/cliente/services",
  ])
    assert.ok(discoveryNavigationState({ ...origin, pathname }));
  for (const pathname of [
    "https://outside.example.test/cliente/explore",
    "//outside.example.test/cliente/explore",
    "/cliente/explore/../wallet",
    "/cliente/explore-fake",
    "/cliente/wallet",
    "/superadmin/dashboard",
    "/login",
  ]) {
    assert.equal(discoveryNavigationState({ ...origin, pathname }), null);
    assert.equal(
      readDiscoveryNavigationState({
        discoveryOrigin: { ...origin, pathname },
      }),
      null,
    );
  }
});

test("entrada directa y state incompleto o ajeno usan fallback sin confiar en índices del navegador", () => {
  for (const state of [
    null,
    undefined,
    {},
    { idx: 14 },
    { returnTo: "https://outside.example.test" },
    { discoveryOrigin: null },
    { discoveryOrigin: { ...origin, key: "" } },
    { discoveryOrigin: { ...origin, key: 2 } },
    { discoveryOrigin: { ...origin, search: "https://outside.example.test" } },
    { discoveryOrigin: { ...origin, hash: "/cliente/wallet" } },
    { discoveryOrigin: { pathname: origin.pathname } },
  ])
    assert.equal(readDiscoveryNavigationState(state), null);
});
