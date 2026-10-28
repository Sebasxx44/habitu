import assert from "node:assert/strict";
import test from "node:test";
import { visibleNavigation } from "@/components/TA/navigation";

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
