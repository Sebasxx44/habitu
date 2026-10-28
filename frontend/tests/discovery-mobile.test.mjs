import assert from "node:assert/strict";
import test from "node:test";
import { URL, URLSearchParams } from "node:url";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { DiscoverySearchTA } from "@/modules/discovery/components/DiscoverySearchTA";
import { DiscoveryHeroTA } from "@/modules/discovery/components/DiscoveryHeroTA";
import { DiscoveryCategoriesTA } from "@/modules/discovery/components/DiscoveryCategoriesTA";
import { discoveryUiEs } from "@/modules/discovery/locales";
import { readDiscoveryFilters } from "@/modules/discovery/query";
import { nextSuggestionIndex } from "@/modules/discovery/services/suggestionNavigation";

// TEST CONTEXT
globalThis.localStorage = { getItem: () => null };
const { BusinessCardTA } =
  await import("@/modules/discovery/components/BusinessCardTA");
const translations = createInstance();
await translations.init({
  lng: "es",
  resources: {
    es: {
      discoveryUi: discoveryUiEs,
      marketplace: { discovery: { reserve: "Reservar" } },
    },
  },
});
const render = (component, props) =>
  renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n: translations },
      createElement(
        StaticRouter,
        { location: "/cliente/explore" },
        createElement(component, props),
      ),
    ),
  );
const noop = () => {};
const search = {
  draft: "Pereira",
  setDraft: noop,
  suggest: true,
  setSuggest: noop,
  choose: noop,
  suggestions: [{ id: 7, type: "business", label: "Lugar publicado" }],
};
const business = {
  id: 7,
  name: "Lugar publicado",
  address: "Pereira",
  booking_mode: "internal",
  price_from: null,
  distance_km: null,
  reviews_count: 0,
  service_previews: [
    { id: 12, name: "Servicio publicado", price: 25000, duration_minutes: 30 },
  ],
  next_available: {
    service_id: 12,
    branch_id: 3,
    date: "2026-10-30",
    start_time: "10:30:00",
  },
};
const cardProps = {
  business,
  selected: false,
  favorite: false,
  busy: false,
  onSelect: noop,
  onFavorite: noop,
};

// REGRESSIONS
test("el teclado del buscador respeta límites, lista vacía y selección obsoleta", () => {
  assert.equal(nextSuggestionIndex(-1, 3, "ArrowDown"), 0);
  assert.equal(nextSuggestionIndex(-1, 3, "ArrowUp"), 2);
  assert.equal(nextSuggestionIndex(2, 3, "ArrowDown"), 2);
  assert.equal(nextSuggestionIndex(0, 3, "ArrowUp"), 0);
  assert.equal(nextSuggestionIndex(8, 2, "ArrowDown"), 0);
  assert.equal(nextSuggestionIndex(8, 2, "ArrowUp"), 1);
  assert.equal(nextSuggestionIndex(0, 0, "ArrowDown"), -1);
});

test("dos buscadores conservan etiquetas y listas ARIA independientes", () => {
  const Pair = () =>
    createElement(
      Fragment,
      null,
      createElement(DiscoverySearchTA, { search }),
      createElement(DiscoverySearchTA, { search }),
    );
  const markup = render(Pair);
  const inputs = [...markup.matchAll(/<input\b[^>]*role="combobox"[^>]*>/g)];
  assert.equal(inputs.length, 2);
  const ids = inputs.map(([input]) => input.match(/\bid="([^"]+)"/)[1]);
  assert.equal(new Set(ids).size, 2);
  for (const [input] of inputs) {
    const inputId = input.match(/\bid="([^"]+)"/)[1];
    const listId = input.match(/aria-controls="([^"]+)"/)[1];
    assert.ok(markup.includes(`for="${inputId}"`));
    assert.ok(markup.includes(`id="${listId}"`));
    assert.match(input, /aria-expanded="true"/);
    assert.doesNotMatch(input, /aria-activedescendant/);
  }
  assert.equal((markup.match(/role="option"/g) ?? []).length, 2);
  const options = [...markup.matchAll(/<button\b[^>]*role="option"[^>]*>/g)];
  for (const [option] of options) assert.match(option, /tabindex="-1"/);
});

test("una tarjeta externa conserva el enlace oficial sin inventar disponibilidad interna", () => {
  const markup = render(BusinessCardTA, {
    ...cardProps,
    business: {
      ...business,
      booking_mode: "external",
      booking_url: "https://agenda.example.test/reservar",
      price_from: 25000,
    },
  });
  assert.match(markup, /href="https:\/\/agenda\.example\.test\/reservar"/);
  assert.match(markup, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(markup, /book=1|service_id=|10:30|25\.000/);
  assert.match(markup, /aria-label="Guardar Lugar publicado en favoritos"/);
  assert.match(markup, /<article[^>]*aria-labelledby=/);
  assert.match(markup, /<h3 id=/);
});

test("al actualizar resultados las tarjetas sólo enlazan al perfil sin reservar slots anteriores", () => {
  const markup = render(BusinessCardTA, { ...cardProps, updating: true });
  assert.match(markup, /href="\/cliente\/business\/7"/);
  assert.doesNotMatch(markup, /book=1|service_id=|10:30|aria-expanded="true"/);
  assert.match(markup, /Ver servicios/);
});

test("una tarjeta actualizada permite reservar su propio servicio y horario publicados", () => {
  const markup = render(BusinessCardTA, cardProps);
  const links = [...markup.matchAll(/href="([^"]+)"/g)].map(
    ([, href]) =>
      new URL(href.replaceAll("&amp;", "&"), "https://app.example.test"),
  );
  const booking = links.find((link) => link.searchParams.get("book") === "1");
  assert.ok(booking);
  assert.equal(booking.pathname, "/cliente/business/7");
  assert.equal(booking.searchParams.get("service_id"), "12");
  assert.equal(booking.searchParams.get("branch_id"), "3");
  assert.equal(booking.searchParams.get("date"), "2026-10-30");
  assert.equal(booking.searchParams.get("time"), "10:30");
});

test("la búsqueda compacta muestra filtros activos y una categoría seleccionada fuera del grupo inicial", () => {
  const filters = {
    values: readDiscoveryFilters(
      new URLSearchParams("zone=Pereira&date=2026-10-30&category_id=8"),
    ),
    count: 3,
    change: noop,
    clear: noop,
  };
  const hero = render(DiscoveryHeroTA, {
    search,
    filters,
    location: { point: null, loading: false, locate: noop, clear: noop },
    onFilters: noop,
  });
  assert.match(hero, /<details[^>]*>/);
  assert.doesNotMatch(hero, /<details[^>]*\sopen[\s=>]/);
  assert.match(hero, /Pereira · 2026-10-30/);
  assert.match(hero, /type="submit"/);
  const categories = Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    name: `Categoría ${index + 1}`,
  }));
  const picker = render(DiscoveryCategoriesTA, { categories, filters });
  assert.match(picker, /aria-pressed="true"[^>]*>[\s\S]*?Categoría 8/);
  assert.doesNotMatch(picker, /Categoría 5|Categoría 6|Categoría 7/);
});
