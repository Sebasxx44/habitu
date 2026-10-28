import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatedDestination,
  browseDestination,
  guestHome,
  loginPath,
} from "@/modules/auth/services/routeAccess";

test("el inicio de invitados permite explorar antes de iniciar sesión", () => {
  assert.equal(guestHome, "/cliente/explore");
});

test("el acceso conserva búsqueda, reserva y sección sin convertirlos en otra URL", () => {
  const destination =
    "/cliente/business/42?book=1&service_id=7&branch_id=3&resource_id=9&date=2026-11-02&time=10%3A30&duration_minutes=60&participants=2&q=café%20%26%20corte#horarios";
  const login = new URL(loginPath(destination), "https://habitu.test");
  assert.equal(login.origin, "https://habitu.test");
  assert.equal(login.pathname, "/login");
  assert.equal(login.hash, "");
  assert.equal(login.searchParams.size, 1);
  assert.equal(login.searchParams.get("returnTo"), destination);
  assert.equal(authenticatedDestination("CLIENTE", destination), destination);
});

test("los roles de gestión vuelven a su espacio al ingresar desde el catálogo cliente", () => {
  const requested = "/cliente/business/42?book=1&service_id=7#horarios";
  for (const [role, home] of [
    ["SUPERADMIN", "/superadmin/dashboard"],
    ["ADMIN_BARBERIA", "/admin/dashboard"],
    ["PROFESSIONAL", "/professional/dashboard"],
  ])
    assert.equal(authenticatedDestination(role, requested), home);
});

test("cada rol conserva rutas de su espacio y opciones de su propia cuenta", () => {
  for (const [role, destination] of [
    ["CLIENTE", "/cliente/appointments/14?tab=details#reserva"],
    ["SUPERADMIN", "/superadmin/users?search=Ana#permisos"],
    ["ADMIN_BARBERIA", "/admin/appointments?date=2026-11-02#agenda"],
    ["PROFESSIONAL", "/professional/availability?branch_id=3#horarios"],
  ]) {
    assert.equal(authenticatedDestination(role, destination), destination);
    assert.equal(
      authenticatedDestination(
        role,
        "/account/profile?section=security#sesiones",
      ),
      "/account/profile?section=security#sesiones",
    );
  }
});

test("un destino de otro rol no cambia el espacio asignado al iniciar sesión", () => {
  for (const [role, requested, expected] of [
    ["CLIENTE", "/admin/appointments", "/cliente/dashboard"],
    ["SUPERADMIN", "/admin/appointments", "/superadmin/dashboard"],
    ["ADMIN_BARBERIA", "/professional/availability", "/admin/dashboard"],
    ["PROFESSIONAL", "/superadmin/users", "/professional/dashboard"],
    ["CLIENTE", "/cliente-externo/appointments", "/cliente/dashboard"],
  ])
    assert.equal(authenticatedDestination(role, requested), expected);
});

test("destinos externos, controles y rutas de autenticación no se reutilizan", () => {
  for (const requested of [
    "https://evil.test/cliente/explore",
    "//evil.test/cliente/explore",
    "javascript:alert(1)",
    "/\\evil.test/cliente/explore",
    "/cliente/explore\nlocation=evil",
    "/login?returnTo=/cliente/explore",
    "/register?returnTo=/cliente/explore",
    "/reset-password?token=private",
  ]) {
    const login = new URL(loginPath(requested), "https://habitu.test");
    assert.equal(login.searchParams.get("returnTo"), guestHome, requested);
    assert.equal(
      authenticatedDestination("CLIENTE", requested),
      "/cliente/dashboard",
      requested,
    );
  }
});

test("segmentos de navegación normalizados no pueden introducir otra ruta", () => {
  for (const requested of [
    "/cliente/../cliente/explore?book=1",
    "/cliente/%2e%2e/cliente/explore?book=1",
    "/cliente/../../account/profile",
    "/cliente/%2E%2E/admin/appointments",
  ]) {
    assert.equal(
      new URL(loginPath(requested), "https://habitu.test").searchParams.get(
        "returnTo",
      ),
      guestHome,
      requested,
    );
    assert.equal(
      authenticatedDestination("CLIENTE", requested),
      "/cliente/dashboard",
      requested,
    );
  }
  const validQuery = "/cliente/explore?q=..%2Fpeluquería#resultados";
  assert.equal(authenticatedDestination("CLIENTE", validQuery), validQuery);
});

test("seguir explorando conserva la selección pública y sus filtros completos", () => {
  for (const destination of [
    "/cliente/explore?q=café&category_id=2#mapa",
    "/cliente/services?business_id=42&duration_minutes=60#servicios",
    "/cliente/booking?service_id=7&date=2026-11-02#horarios",
    "/cliente/business/42?book=1&service_id=7&branch_id=3&resource_id=9&date=2026-11-02&time=10%3A30&duration_minutes=60&participants=2#reserva",
    "/cliente/shop/42?service_id=7#servicios",
    "/b/estudio-norte?service_id=7#servicios",
  ])
    assert.equal(browseDestination(destination), destination);
});

test("seguir sin cuenta desde destinos privados evita volver a pedir acceso en bucle", () => {
  for (const destination of [
    null,
    "/cliente/dashboard",
    "/cliente/appointments/14?tab=details#reserva",
    "/cliente/favorites",
    "/cliente/wallet?checkout=private-order",
    "/cliente/checkout/private-order",
    "/account/profile",
    "/superadmin/dashboard",
    "/login?returnTo=/cliente/appointments",
    "https://evil.test/cliente/explore",
    "/cliente/../cliente/explore",
    "/cliente/business/not-a-business",
  ])
    assert.equal(browseDestination(destination), guestHome, String(destination));
});
