import assert from "node:assert/strict";
import test from "node:test";
import { notificationDestination } from "@/modules/notifications/destination";

test("notificaciones de citas conservan rutas y parámetros propios del rol", () => {
  assert.equal(
    notificationDestination("/cliente/appointments/42", "CLIENTE"),
    "/cliente/appointments/42",
  );
  assert.equal(
    notificationDestination(
      "/barbero/appointments?date=2026-10-05",
      "PROFESSIONAL",
    ),
    "/professional/appointments?date=2026-10-05",
  );
  assert.equal(
    notificationDestination("/admin/appointments", "ADMIN_BARBERIA"),
    "/admin/appointments",
  );
});

test("notificaciones no pueden abrir URLs externas, esquemas ejecutables ni otro rol", () => {
  for (const value of [
    "javascript:alert(1)",
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/cliente/../../admin/appointments",
    "/cliente/\nappointments",
    "/admin/appointments",
    "/cliente/%2e%2e/admin/appointments",
  ])
    assert.equal(notificationDestination(value, "CLIENTE"), null);
  assert.equal(
    notificationDestination("/cliente/appointments/42", undefined),
    null,
  );
});
