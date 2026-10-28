import assert from "node:assert/strict";
import test from "node:test";
import {
  groupMapMarkers,
  mapMarkerLabel,
  mapPoint,
  resolveMapShop,
  resolveMapShops,
} from "@/modules/discovery/mapPoints";

// FIXTURES
const branch = (id, coordinates = {}) => ({
  id,
  business_id: 4,
  name: `Sede ${id}`,
  address: `Dirección de sede ${id}`,
  is_active: true,
  ...coordinates,
});
const business = (id, coordinates = {}) => ({
  id,
  name: `Negocio ${id}`,
  ...coordinates,
});
const located = (id, lat, lng) => resolveMapShop(business(id, { lat, lng }));
const project = ({ lat, lng }) => ({ x: lat, y: lng });

// COORDINATES
test("sólo acepta pares geográficos finitos y no convierte vacíos en ubicaciones cero", () => {
  assert.deepEqual(mapPoint("4.8133", "-75.6961"), {
    lat: 4.8133,
    lng: -75.6961,
  });
  assert.deepEqual(mapPoint(0, 0), { lat: 0, lng: 0 });
  for (const pair of [
    [null, 0],
    ["", 0],
    [0, "  "],
    [undefined, 1],
    [91, 0],
    [0, -181],
    [Infinity, 0],
    ["NaN", 0],
  ]) {
    assert.equal(mapPoint(...pair), null);
  }
});

test("nunca mezcla una coordenada del negocio con otra de una sede", () => {
  const resolved = resolveMapShop(
    business(4, {
      lat: 4.5,
      lng: null,
      main_branch: branch(8, { lat: 4.81, lng: -75.69 }),
    }),
  );
  assert.deepEqual(resolved.point, { lat: 4.81, lng: -75.69 });
  assert.equal(resolved.address, "Dirección de sede 8");
  assert.equal(
    resolveMapShop(
      business(4, { lat: 4.5, main_branch: branch(8, { lng: -75.69 }) }),
    ),
    null,
  );
});

test("resuelve aliases y prueba otra sede activa si la principal carece de ubicación", () => {
  const own = resolveMapShop(
    business(4, { lat: "", lng: "", latitude: "4.82", longitude: "-75.70" }),
  );
  assert.deepEqual(own.point, { lat: 4.82, lng: -75.7 });
  const resolved = resolveMapShop(
    business(4, {
      mainBranch: branch(1, { lat: null, lng: null }),
      branches: [
        branch(2, { is_active: false, lat: 4.1, lng: -75.1 }),
        branch(3, { latitude: "4.83", longitude: "-75.71" }),
      ],
    }),
  );
  assert.deepEqual(resolved.point, { lat: 4.83, lng: -75.71 });
  assert.equal(resolved.address, "Dirección de sede 3");
});

test("las ocho fichas sin coordenadas se conservan para el aviso sin generar marcadores", () => {
  const shops = Array.from({ length: 8 }, (_, index) =>
    business(index + 4, {
      lat: null,
      lng: null,
      main_branch: branch(index + 4, { lat: null, lng: null }),
    }),
  );
  const result = resolveMapShops(shops);
  assert.deepEqual(result.located, []);
  assert.deepEqual(
    result.missing.map((shop) => shop.id),
    [4, 5, 6, 7, 8, 9, 10, 11],
  );
  assert.equal(result.missing[0], shops[0]);
  assert.deepEqual(
    resolveMapShops([
      shops[0],
      business(20, { lat: 4.8, lng: -75.7 }),
    ]).located.map((shop) => shop.id),
    [20],
  );
});

// MARKERS
test("un clúster conserva cada negocio incluso cuando comparten coordenadas exactas", () => {
  const shops = [
    located(4, 4.81, -75.69),
    located(5, 4.81, -75.69),
    located(6, 4.81, -75.69),
  ];
  const groups = groupMapMarkers(shops, project);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].shops.map((shop) => shop.id),
    [4, 5, 6],
  );
  assert.deepEqual(groups[0].point, shops[0].point);

  const selected = groupMapMarkers(shops, project, 5);
  assert.deepEqual(
    selected
      .find((group) => group.key === "shop-5")
      .shops.map((shop) => shop.id),
    [5],
  );
  assert.deepEqual(
    selected.flatMap((group) => group.shops.map((shop) => shop.id)).sort(),
    [4, 5, 6],
  );
});

test("al acercar la proyección se separan puntos sin perder perfiles", () => {
  const shops = [located(4, 4, 10), located(5, 5, 10)];
  assert.equal(groupMapMarkers(shops, project).length, 1);
  const zoomed = groupMapMarkers(shops, ({ lat, lng }) => ({
    x: lat * 100,
    y: lng * 100,
  }));
  assert.equal(zoomed.length, 2);
  assert.deepEqual(
    zoomed.flatMap((group) => group.shops.map((shop) => shop.id)),
    [4, 5],
  );
});

test("un marcador externo o sin precio no anuncia servicios gratuitos ni precios ficticios", () => {
  const shop = located(4, 4.81, -75.69);
  assert.equal(mapMarkerLabel(shop), "Ver lugar");
  assert.equal(
    mapMarkerLabel({
      ...shop,
      booking_mode: "external",
      price_from: 0,
      services: [{ price: 25000 }],
    }),
    "Ver lugar",
  );
  assert.equal(mapMarkerLabel({ ...shop, price_from: NaN }), "Ver lugar");
  assert.notEqual(mapMarkerLabel({ ...shop, price_from: 25000 }), "Ver lugar");
});
