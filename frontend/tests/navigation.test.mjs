import assert from "node:assert/strict";
import test from "node:test";
import { guestNavigation, visibleNavigation } from "@/components/TA/navigation";
import { loginPath } from "@/modules/auth/services/routeAccess";

test("un cliente nunca recibe navegación administrativa aunque tenga un permiso con ese nombre", () => {
  const items = visibleNavigation("CLIENTE", [
    "users.view",
    "roles.view",
    "appointments.view",
  ]);
  assert(items.length > 0);
  assert(items.every((item) => item.path.startsWith("/cliente/")));
  assert(items.some((item) => item.path === "/cliente/appointments"));
});

test("revocar un permiso oculta el acceso asociado sin perder el inicio", () => {
  const items = visibleNavigation("ADMIN_BARBERIA", []);
  assert(!items.some((item) => item.path === "/admin/clients"));
  assert(!items.some((item) => item.path === "/admin/reports"));
  assert(items.some((item) => item.path === "/admin/dashboard"));
});

test("un profesional mantiene accesos personales y no hereda gestión de usuarios", () => {
  const items = visibleNavigation("PROFESSIONAL", [
    "appointments.view",
    "users.view",
  ]);
  assert(items.some((item) => item.path === "/professional/appointments"));
  assert(!items.some((item) => item.path === "/superadmin/users"));
  assert(!items.some((item) => item.path === "/admin/services"));
});

test("un visitante ve explorar y servicios sin recibir navegación administrativa", () => {
  const paths = guestNavigation().map((item) => item.path);
  assert(paths.includes("/cliente/explore"));
  assert(paths.includes("/cliente/services"));
  assert(paths.every((path) => path.startsWith("/cliente/")));
  assert(!paths.includes("/admin/dashboard"));
  assert(!paths.includes("/superadmin/users"));
  assert(!paths.includes("/professional/earnings"));
  assert.equal(new Set(paths).size, paths.length);
});

test("los accesos personales del menú visitante llevan al login conservando su destino", () => {
  const paths = guestNavigation().map((item) => item.path);
  for (const path of ["/cliente/appointments", "/cliente/favorites"]) {
    assert(paths.includes(path));
    const destination = new URL(loginPath(path), "https://habitu.test");
    assert.equal(destination.pathname, "/login");
    assert.equal(destination.searchParams.get("returnTo"), path);
  }
});
