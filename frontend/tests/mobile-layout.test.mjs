import assert from "node:assert/strict";
import test from "node:test";
import {
  bottomNavigationItems,
  uniqueNavigationItems,
} from "@/composables/layout/navigationItems";
import {
  rememberScrollPosition,
  routeScrollPlan,
} from "@/composables/layout/scrollPolicy";
import { hasVirtualKeyboard } from "@/composables/layout/viewportPolicy";

// TEST CONTEXT
const results = {
  key: "results",
  pathname: "/cliente/explore",
  search: "?q=peluquería",
  hash: "",
};
const profile = {
  key: "profile",
  pathname: "/cliente/business/8",
  search: "",
  hash: "",
};

// REGRESSIONS
test("regresar de un perfil conserva la posición de los resultados filtrados", () => {
  const saved = { left: 0, top: 1640 };
  assert.deepEqual(routeScrollPlan(results, profile, "PUSH"), { kind: "top" });
  assert.deepEqual(routeScrollPlan(profile, results, "POP", saved), {
    kind: "position",
    position: saved,
  });
  assert.deepEqual(routeScrollPlan(profile, results, "POP"), {
    kind: "preserve",
  });
});

test("cambiar filtros o limpiar book en la misma página conserva el scroll", () => {
  assert.deepEqual(
    routeScrollPlan(
      results,
      { ...results, key: "filtered", search: "?q=veterinaria" },
      "REPLACE",
    ),
    { kind: "preserve" },
  );
  assert.deepEqual(
    routeScrollPlan({ ...profile, search: "?book=1" }, profile, "REPLACE"),
    { kind: "preserve" },
  );
  assert.deepEqual(routeScrollPlan(null, results, "POP"), { kind: "preserve" });
});

test("los destinos con hash se recuperan sin invalidar posiciones de historial", () => {
  const anchor = { ...results, hash: "#discovery-business-8" };
  assert.deepEqual(routeScrollPlan(profile, anchor, "PUSH"), {
    kind: "anchor",
    id: "discovery-business-8",
  });
  assert.deepEqual(
    routeScrollPlan(null, { ...results, hash: "#caf%C3%A9" }, "POP"),
    { kind: "anchor", id: "café" },
  );
  assert.deepEqual(
    routeScrollPlan(null, { ...results, hash: "#%incorrecto" }, "POP"),
    { kind: "anchor", id: "%incorrecto" },
  );
  const saved = { left: 0, top: 2200 };
  assert.deepEqual(routeScrollPlan(profile, anchor, "POP", saved), {
    kind: "position",
    position: saved,
  });
});

test("el historial de filtros no acumula posiciones sin límite", () => {
  const positions = new Map();
  for (let index = 0; index < 100; index++)
    rememberScrollPosition(positions, String(index), { left: 0, top: index });
  rememberScrollPosition(positions, "0", { left: 0, top: 900 });
  rememberScrollPosition(positions, "latest", { left: 0, top: 1800 });
  assert.equal(positions.size, 100);
  assert.equal(positions.has("1"), false);
  assert.deepEqual(positions.get("0"), { left: 0, top: 900 });
  assert.deepEqual(positions.get("latest"), { left: 0, top: 1800 });
});

test("la barra reserva un quinto lugar para Más y no repite destinos", () => {
  const items = [
    "inicio",
    "explorar",
    "reservas",
    "analítica",
    "favoritos",
  ].map((path) => ({ path: `/${path}`, label: path }));
  const duplicates = [items[0], ...items];
  assert.equal(uniqueNavigationItems(duplicates).length, 5);
  assert.deepEqual(bottomNavigationItems(duplicates), items.slice(0, 4));
  assert.deepEqual(bottomNavigationItems(duplicates, 10), items.slice(0, 4));
  assert.deepEqual(bottomNavigationItems(duplicates, 3), items.slice(0, 3));
});

test("el teclado oculta la barra sólo mientras se edita con reducción suficiente del viewport", () => {
  const viewport = {
    editable: true,
    layoutHeight: 844,
    viewportHeight: 520,
    scale: 1,
  };
  assert.equal(hasVirtualKeyboard(viewport), true);
  assert.equal(hasVirtualKeyboard({ ...viewport, editable: false }), false);
  assert.equal(hasVirtualKeyboard({ ...viewport, viewportHeight: 760 }), false);
  assert.equal(hasVirtualKeyboard({ ...viewport, scale: 2 }), false);
});
