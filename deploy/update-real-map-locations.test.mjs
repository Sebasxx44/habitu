import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { readCatalog } from "./import-real-catalog.mjs";
import {
  readMapLocations,
  updateRealMapLocations,
  validateMapLocations,
} from "./update-real-map-locations.mjs";

// TEST CONTEXT
const catalog = await readCatalog();
const locations = await readMapLocations();
const credentials = {
  origin: "https://habitu-sebaz-api.onrender.com",
  email: "maps-admin@example.test",
  password: "fake-map-password",
};
const token = "fake-token-created-by-map-updater";
const businessWrites = (calls) =>
  calls.filter(
    (call) => call.path.startsWith("/api/v2/") && call.method !== "GET",
  );

const server = ({ role = "SUPERADMIN", origin = credentials.origin } = {}) => {
  const businesses = new Map(
    catalog.businesses.map((row, index) => [
      index + 4,
      {
        id: index + 4,
        slug: row.slug,
        name: row.name,
        address: row.address,
        owner_user_id: null,
        booking_mode: "external",
        is_active: true,
        phone: row.phone,
        email: row.email,
        website: row.website,
        banner_url: row.photo.url,
        booking_url: row.booking_url,
        listing_source_url: row.listing_source_url,
        lat: null,
        lng: null,
        services: [],
        professionals: [],
        resources: [],
        branches: [
          {
            id: index + 104,
            address: row.address,
            lat: null,
            lng: null,
            is_main_branch: true,
            is_active: true,
            schedules: [],
          },
        ],
      },
    ]),
  );
  const original = structuredClone(businesses);
  const calls = [];
  const messages = [];
  const controls = {
    timeoutPut: false,
    invalidPut: false,
    corruptPut: false,
    invalidRead: false,
    staleRead: false,
  };
  let mutations = 0;
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(String(init.body)) : null;
    assert.equal(
      url.origin,
      origin,
      "Nunca se envía autorización a las fuentes de mapas o imágenes.",
    );
    assert.equal(init.redirect, "manual");
    assert.equal(headers.get("Cookie"), null);
    calls.push({ method, path: url.pathname, body, headers });
    if (url.pathname === "/api/auth/login") {
      assert.equal(headers.get("Authorization"), null);
      assert.deepEqual(body, {
        email: credentials.email,
        password: credentials.password,
      });
      return Response.json({ token });
    }
    assert.equal(headers.get("Authorization"), `Bearer ${token}`);
    if (url.pathname === "/api/auth/me")
      return Response.json({ user: { id: 71, role } });
    if (url.pathname === "/api/auth/logout")
      return Response.json({ success: true });
    if (url.pathname === "/api/v2/businesses" && method === "GET")
      return Response.json({ data: [...businesses.values()] });
    const id = Number(url.pathname.split("/").at(-1));
    const business = businesses.get(id);
    assert.ok(business);
    if (method === "PUT") {
      // The entire batch must be read and validated before the first mutation.
      for (const existingId of businesses.keys())
        assert.ok(
          calls.some(
            (call) =>
              call.method === "GET" &&
              call.path === `/api/v2/businesses/${existingId}`,
          ),
        );
      assert.deepEqual(Object.keys(body).sort(), ["lat", "lng"]);
      mutations++;
      business.lat = body.lat;
      business.lng = body.lng;
      Object.assign(business.branches[0], body);
      if (controls.timeoutPut)
        throw new Error(`unsafe-error-${credentials.password}-${token}`);
      if (controls.invalidPut) return Response.json({ data: original.get(id) });
      if (controls.corruptPut)
        business.banner_url = "https://changed.example.test/image.jpg";
    } else assert.equal(method, "GET");
    if (method === "GET" && mutations && controls.invalidRead)
      return Response.json({ data: { ...business, owner_user_id: 99 } });
    if (method === "GET" && mutations && controls.staleRead)
      return Response.json({ data: original.get(id) });
    return Response.json({ data: business });
  };
  const run = () =>
    updateRealMapLocations({
      catalog,
      locations,
      credentials: { ...credentials, origin },
      local: origin === "http://localhost:8000",
      apply: true,
      fetcher,
      log: (message) => messages.push(message),
    });
  return { businesses, original, calls, controls, messages, run };
};

// REGRESSIONS
test("dry-run predeterminado valida ocho publicaciones sin red ni credenciales", async () => {
  assert.equal(validateMapLocations(catalog, locations), undefined);
  const result = await updateRealMapLocations({
    catalog,
    locations,
    fetcher: async () => {
      throw new Error("No debe haber red");
    },
  });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.locations.length, 8);
  assert.equal(result.writes, 0);
  assert.throws(() => validateMapLocations(catalog, locations.slice(1)));
  assert.throws(() =>
    validateMapLocations(
      catalog,
      locations.map((point, index) =>
        index ? point : { ...point, slug: "negocio-ajeno" },
      ),
    ),
  );
  assert.throws(() =>
    validateMapLocations(
      catalog,
      locations.map((point, index) => (index ? point : { ...point, lat: 0 })),
    ),
  );
});

test("aplicar prevalida ocho fichas, escribe sólo lat/lng, confirma PUT+GET y cierra su token", async () => {
  const mock = server();
  const result = await mock.run();
  assert.equal(result.updated.length, 8);
  assert.equal(result.unchanged.length, 0);
  assert.equal(businessWrites(mock.calls).length, 8);
  assert.equal(mock.calls.at(-1).path, "/api/auth/logout");
  assert.equal(
    mock.calls.at(-1).headers.get("Authorization"),
    `Bearer ${token}`,
  );
  for (const [id, business] of mock.businesses) {
    const point = locations.find((item) => item.slug === business.slug);
    const before = mock.original.get(id);
    assert.deepEqual(business, {
      ...before,
      lat: point.lat,
      lng: point.lng,
      branches: [{ ...before.branches[0], lat: point.lat, lng: point.lng }],
    });
    const writes = mock.calls.filter(
      (call) => call.path === `/api/v2/businesses/${id}`,
    );
    assert.deepEqual(
      writes.map((call) => call.method),
      ["GET", "PUT", "GET"],
    );
  }
  const output = JSON.stringify({ result, messages: mock.messages });
  for (const secret of [credentials.email, credentials.password, token])
    assert.equal(output.includes(secret), false);
});

test("rerun es idempotente y acepta los decimales SQL exactos sin volver a escribir", async () => {
  const mock = server();
  await mock.run();
  for (const business of mock.businesses.values()) {
    business.lat = business.lat.toFixed(8);
    business.lng = business.lng.toFixed(8);
    business.branches[0].lat = business.lat;
    business.branches[0].lng = business.lng;
  }
  mock.calls.length = 0;
  const result = await mock.run();
  assert.equal(result.updated.length, 0);
  assert.equal(result.unchanged.length, 8);
  assert.deepEqual(businessWrites(mock.calls), []);
});

test("cualquier identidad, propietario, dirección o estado ajeno detiene todo antes de PUT", async () => {
  for (const patch of [
    { name: "Otro nombre" },
    { address: "Otra dirección" },
    { owner_user_id: 71 },
    { is_active: false },
    { booking_mode: "internal" },
  ]) {
    const mock = server();
    Object.assign(mock.businesses.get(11), patch);
    await assert.rejects(mock.run());
    assert.deepEqual(businessWrites(mock.calls), []);
    assert.equal(mock.calls.at(-1).path, "/api/auth/logout");
  }
  const missing = server();
  missing.businesses.delete(11);
  await assert.rejects(missing.run(), /ficha única/);
  assert.deepEqual(businessWrites(missing.calls), []);
});

test("puntos existentes diferentes o parciales nunca se sobrescriben, incluso en la última ficha", async () => {
  for (const patch of [
    { lat: 4.8, lng: -75.7 },
    { lat: 0, lng: 0 },
    { lat: locations[7].lat, lng: null },
    { lat: locations[7].lat, lng: locations[7].lng },
  ]) {
    const mock = server();
    Object.assign(mock.businesses.get(11), patch);
    await assert.rejects(mock.run(), /coordenadas previas/);
    assert.deepEqual(businessWrites(mock.calls), []);
    assert.deepEqual(
      mock.businesses.get(11).branches[0],
      mock.original.get(11).branches[0],
    );
  }
});

test("rol ajeno y origen no autorizado no producen CRUD, también en aplicación local", async () => {
  const denied = server({ role: "ADMIN_BARBERIA" });
  await assert.rejects(denied.run(), /SUPERADMIN/);
  assert.deepEqual(businessWrites(denied.calls), []);
  assert.equal(denied.calls.at(-1).path, "/api/auth/logout");
  let requests = 0;
  for (const origin of [
    "https://outside.example.test",
    credentials.origin + "/api",
    "http://127.0.0.1:8000",
  ])
    await assert.rejects(
      updateRealMapLocations({
        catalog,
        locations,
        credentials: { ...credentials, origin },
        apply: true,
        fetcher: async () => {
          requests++;
          return Response.json({});
        },
      }),
      /origen exacto/,
    );
  assert.equal(requests, 0);
  const local = server({ origin: "http://localhost:8000" });
  assert.equal((await local.run()).updated.length, 8);
});

test("timeout tras PUT no se reintenta ni continúa y no filtra secretos del error", async () => {
  const mock = server();
  mock.controls.timeoutPut = true;
  await assert.rejects(mock.run(), (error) => {
    assert.match(error.message, /No se confirmó PUT.*no se reintentó/);
    assert.equal(error.message.includes(credentials.password), false);
    assert.equal(error.message.includes(token), false);
    return true;
  });
  assert.equal(businessWrites(mock.calls).length, 1);
  assert.equal(mock.calls.at(-1).path, "/api/auth/logout");
  assert.equal(mock.businesses.get(4).lat, locations[0].lat);
  assert.equal(mock.businesses.get(5).lat, null);
});

test("PUT incompleto, metadata alterada y GET posterior inconsistente frenan las siguientes escrituras", async () => {
  for (const control of [
    "invalidPut",
    "corruptPut",
    "invalidRead",
    "staleRead",
  ]) {
    const mock = server();
    mock.controls[control] = true;
    await assert.rejects(mock.run());
    assert.equal(businessWrites(mock.calls).length, 1);
    assert.equal(mock.calls.at(-1).path, "/api/auth/logout");
  }
});
