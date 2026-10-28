import assert from "node:assert/strict";
import test from "node:test";
import { URL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import {
  externalBookingUrl,
  isExternalBooking,
  safeOfficialUrl,
} from "@/modules/businesses/booking";
import { ExternalBookingButtonTA } from "@/modules/businesses/components/ExternalBookingButtonTA";
import { ExternalBookingPanelTA } from "@/modules/businesses/components/ExternalBookingPanelTA";
import { discoveryUiEs } from "@/modules/discovery/locales";
import { discoveryBookingLink } from "@/modules/discovery/query";
import { discoveryIntentFilters } from "@/modules/discovery/filters/intents";

// TEST CONTEXT
const translations = createInstance();
await translations.init({
  lng: "es",
  resources: { es: { discoveryUi: discoveryUiEs } },
});
const render = (component, business) =>
  renderToStaticMarkup(
    createElement(
      I18nextProvider,
      { i18n: translations },
      createElement(component, { business }),
    ),
  );
const external = {
  id: 19,
  name: "Negocio con agenda oficial",
  booking_mode: "external",
  booking_url: "https://agenda.example.test/reservar",
  listing_source_url: "https://example.test/contacto",
};

// REGRESSIONS
test("una intención nueva elimina restricciones de inventario sin prometer horarios externos", () => {
  const filters = discoveryIntentFilters("veterinaria");
  assert.equal(filters.q, "veterinaria");
  for (const key of [
    "service_id",
    "professional_id",
    "resource_id",
    "resource_type",
    "sport_type",
    "booking_model",
    "duration_minutes",
    "participants",
  ])
    assert.equal(filters[key], "");
  assert.equal("available" in filters, false);
  assert.equal("date" in filters, false);
});

test("sólo un negocio externo con URL HTTPS sin credenciales tiene enlace de reservas", () => {
  assert.equal(isExternalBooking(external), true);
  assert.equal(isExternalBooking({}), false);
  assert.equal(externalBookingUrl(external), external.booking_url);
  assert.equal(
    externalBookingUrl({ ...external, booking_mode: "internal" }),
    null,
  );
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,agenda",
    "http://agenda.example.test",
    "https://usuario:clave@agenda.example.test",
    "/reservar",
    "",
    null,
  ]) {
    assert.equal(safeOfficialUrl(value), null);
    assert.equal(externalBookingUrl({ ...external, booking_url: value }), null);
  }
});

test("los enlaces de descubrimiento externos no agregan book=1 ni reutilizan slots", () => {
  const link = discoveryBookingLink(
    {
      ...external,
      next_available: {
        service_id: 22,
        branch_id: 2,
        date: "2026-10-29",
        start_time: "10:00:00",
      },
    },
    22,
    "express",
  );
  assert.equal(link, "/cliente/business/19");
  assert.equal(new URL(link, "https://app.test").search, "");
  assert.match(discoveryBookingLink({ id: 20 }), /book=1/);
});

test("la reserva externa abre sólo la URL oficial, avisa la salida y protege la nueva pestaña", () => {
  const markup = render(ExternalBookingButtonTA, external);
  assert.match(markup, /href="https:\/\/agenda\.example\.test\/reservar"/);
  assert.match(markup, /target="_blank"/);
  assert.match(markup, /rel="noopener noreferrer"/);
  assert.match(markup, /Reservar con el negocio/);
  assert.match(markup, /canal oficial en otra pestaña/);
  assert.doesNotMatch(markup, /book=1|login|09:00|30 min/);
  const whatsapp = render(ExternalBookingButtonTA, {
    ...external,
    booking_url: "https://wa.me/573001234567",
  });
  assert.match(whatsapp, /href="https:\/\/wa\.me\/573001234567"/);
  assert.doesNotMatch(whatsapp, /text=|send/);
});

test("sin canal válido se deshabilita el CTA sin convertirlo en reserva interna", () => {
  const markup = render(ExternalBookingButtonTA, {
    ...external,
    booking_url: null,
  });
  assert.match(markup, /disabled/);
  assert.match(markup, /Canal de reservas no disponible/);
  assert.doesNotMatch(markup, /href=|book=1/);
});

test("el perfil externo muestra fuente pública y deja precios, horarios y confirmación al negocio", () => {
  const markup = render(ExternalBookingPanelTA, external);
  assert.match(markup, /href="https:\/\/example\.test\/contacto"/);
  assert.match(markup, /precios y disponibilidad directamente con el negocio/);
  assert.match(markup, /confirmación se gestionan allí/);
  assert.doesNotMatch(markup, /COP|\$0|30 min|En tiempo real/);
});
