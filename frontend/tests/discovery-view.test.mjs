import assert from "node:assert/strict";
import test from "node:test";
import {
  readDiscoveryView,
  withDiscoveryView,
} from "@/modules/discovery/services/discoveryView";
import {
  discoveryQuery,
  readDiscoveryFilters,
} from "@/modules/discovery/query";

// REGRESSIONS
test("un enlace compartido abre mapa y los valores inválidos mantienen lista", () => {
  assert.equal(readDiscoveryView(new URLSearchParams("view=map")), "map");
  for (const query of ["", "view=list", "view=otro"])
    assert.equal(readDiscoveryView(new URLSearchParams(query)), "list");
});

test("cambiar vista conserva filtros e historial sin mutar la URL anterior", () => {
  const initial = new URLSearchParams("q=Pereira&category_id=3&page=2");
  const map = withDiscoveryView(initial, "map");
  const list = withDiscoveryView(map, "list");
  assert.equal(map.get("q"), "Pereira");
  assert.equal(map.get("category_id"), "3");
  assert.equal(map.get("page"), "2");
  assert.equal(readDiscoveryView(map), "map");
  assert.equal(initial.has("view"), false);
  assert.equal(list.toString(), initial.toString());
  assert.equal(readDiscoveryView(map), "map");
});

test("la vista no se envía a la API ni cambia la consulta de resultados", () => {
  const list = new URLSearchParams("q=Pereira&sort=newest");
  const map = withDiscoveryView(list, "map");
  const listRequest = discoveryQuery(readDiscoveryFilters(list));
  const mapRequest = discoveryQuery(readDiscoveryFilters(map));
  assert.equal(mapRequest.has("view"), false);
  assert.equal(mapRequest.toString(), listRequest.toString());
  const cleared = withDiscoveryView(
    new URLSearchParams(),
    readDiscoveryView(map),
  );
  assert.equal(cleared.toString(), "view=map");
});
