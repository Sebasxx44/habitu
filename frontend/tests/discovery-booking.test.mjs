import test from "node:test";
import assert from "node:assert/strict";
import {
  readDiscoveryFilters,
  discoveryQuery,
  discoveryDay,
  discoveryBookingLink,
} from "@/modules/discovery/query";
import { categoryFilterChange } from "@/modules/discovery/filters/selection";
import { resolveMapTiles } from "@/modules/discovery/mapConfig";
import { assistantBookingLink } from "@/modules/assistant/bookingLink";

test("discovery requires explicit location before applying a distance limit", () => {
  const query = discoveryQuery(
    readDiscoveryFilters(new URLSearchParams("radius=10&q=manicure")),
  );
  assert.equal(query.get("q"), "manicure");
  assert.equal(query.has("radius"), false);
  assert.equal(query.get("per_page"), "12");
  const nearby = discoveryQuery(
    readDiscoveryFilters(new URLSearchParams("lat=4.81&lng=-75.69&radius=20")),
  );
  assert.equal(nearby.get("radius"), "20");
});
test("discovery persists all backend filters and resets invalid pages", () => {
  const filters = readDiscoveryFilters(
    new URLSearchParams(
      "zone=Pereira&max_price=50000&date=2026-10-05&time_from=17:00&promotions=1&page=-3",
    ),
  );
  assert.equal(filters.page, "1");
  assert.equal(discoveryQuery(filters).get("time_from"), "17:00");
  assert.equal(discoveryQuery(filters).get("promotions"), "1");
  assert.equal(discoveryQuery(filters).get("max_price"), "50000");
});
test("quick dates use the booking timezone and survive UTC midnight", () => {
  assert.equal(discoveryDay(0, new Date("2026-10-04T02:00:00Z")), "2026-10-03");
  assert.equal(discoveryDay(1, new Date("2026-10-04T02:00:00Z")), "2026-10-04");
});
test("booking preserves a matching service slot and never reuses another service availability", () => {
  const business = {
    id: 7,
    next_available: {
      service_id: 12,
      branch_id: 3,
      date: "2026-10-05",
      start_time: "17:30:00",
      professional_id: 4,
    },
  };
  const selected = new URL(
    discoveryBookingLink(business, 12),
    "https://app.test",
  );
  assert.equal(selected.searchParams.get("time"), "17:30");
  assert.equal(selected.searchParams.get("branch_id"), "3");
  assert.equal(selected.searchParams.get("book"), "1");
  const otherService = new URL(
    discoveryBookingLink(business, 20),
    "https://app.test",
  );
  assert.equal(otherService.searchParams.has("time"), false);
  assert.equal(otherService.searchParams.get("service_id"), "20");
});
test("map does not call CARTO without a public Basemaps key", () => {
  assert.equal(resolveMapTiles({ VITE_MAP_PROVIDER: "carto" }).provider, "osm");
  assert.equal(
    resolveMapTiles({}).url,
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  );
  const configured = resolveMapTiles(
    { VITE_MAP_PROVIDER: "carto", VITE_CARTO_BASEMAP_KEY: "public/demo" },
    true,
  );
  assert.match(configured.url, /dark_all/);
  assert.match(configured.url, /key=public%2Fdemo/);
  assert.match(configured.attribution, /CARTO/);
});
test("assistant only creates an internal confirmation link from verified ids", () => {
  const card = {
    business_id: 3,
    branch_id: 4,
    service_id: 5,
    professional_id: null,
    date: "2026-10-06",
    promotion: { code: "DEMO-10" },
    url: "https://untrusted.test/confirm",
  };
  const link = new URL(
    assistantBookingLink(card, { professional_id: 8, start_time: "09:00:00" }),
    "https://app.test",
  );
  assert.equal(link.origin, "https://app.test");
  assert.equal(link.pathname, "/cliente/business/3");
  assert.equal(link.searchParams.get("promo_code"), "DEMO-10");
  assert.equal(link.searchParams.get("professional_id"), "8");
});


test("cambiar categoría elimina restricciones incompatibles de canchas y conserva la búsqueda y presupuesto", () => {
  const current = readDiscoveryFilters(new URLSearchParams("q=masaje&zone=Pereira&max_price=49900&category_id=8&resource_type=court&resource_id=4&participants=8&duration_minutes=60&available=1&sport_type=football_5&booking_model=resource"));
  const next = discoveryQuery({ ...current, ...categoryFilterChange("2", current) });
  assert.equal(next.get("category_id"), "2");
  assert.equal(next.get("q"), "masaje");
  assert.equal(next.get("zone"), "Pereira");
  assert.equal(next.get("max_price"), "49900");
  for (const key of ["resource_type", "resource_id", "participants", "duration_minutes", "sport_type", "booking_model", "available"])
    assert.equal(next.has(key), false, key);
  const scheduled = { ...current, date: "2026-10-05" };
  assert.equal(categoryFilterChange("2", scheduled).available, "1");
});
