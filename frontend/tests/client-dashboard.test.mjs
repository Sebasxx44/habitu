import assert from "node:assert/strict";
import test from "node:test";
import {
  guestNavigation,
  primaryClientNavigation,
  visibleNavigation,
} from "@/components/TA/navigation";
import {
  authenticatedDestination,
  browseDestination,
  guestHome,
  roleHome,
} from "@/modules/auth/services/routeAccess";

// TEST CONTEXT
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const { DashboardPage } = await import("@/modules/dashboard/DashboardPage");
const { ClientHomeTA } = await import("@/modules/dashboard/components/ClientHomeTA");
const { ClienteDashboardPage } = await import(
  "@/pages/cliente/ClienteDashboardPage"
);
const { ClienteAnalyticsPage } = await import(
  "@/pages/cliente/ClienteAnalyticsPage"
);

// REGRESSIONS
test("el inicio cliente elige una composición distinta antes de montar los hooks analíticos", () => {
  const home = DashboardPage({ role: "CLIENTE" });
  const analytics = DashboardPage({ role: "CLIENTE", variant: "analytics" });

  assert.notEqual(home.type, analytics.type);
  assert.equal(ClienteDashboardPage().type, ClientHomeTA);
  assert.equal(home.type, ClientHomeTA);
  assert.deepEqual(ClienteAnalyticsPage().props, {
    role: "CLIENTE",
    variant: "analytics",
  });

  for (const role of ["SUPERADMIN", "ADMIN_BARBERIA", "PROFESSIONAL"]) {
    assert.equal(DashboardPage({ role }).type, analytics.type);
    assert.equal(DashboardPage({ role }).props.role, role);
  }
});

test("la navegación principal cliente ofrece cuatro destinos únicos con analítica separada", () => {
  const paths = primaryClientNavigation(["appointments.view"]).map(
    (item) => item.path,
  );

  assert.deepEqual(paths, [
    "/cliente/dashboard",
    "/cliente/explore",
    "/cliente/appointments",
    "/cliente/analytics",
  ]);
  assert.equal(new Set(paths).size, 4);
  const menu = visibleNavigation("CLIENTE", ["appointments.view"]);
  assert(menu.some((item) => item.path === "/cliente/favorites"));
  assert(menu.some((item) => item.path === "/cliente/on-demand"));
});

test("revocar citas conserva inicio y analítica sin conceder permisos administrativos", () => {
  const paths = primaryClientNavigation([]).map((item) => item.path);
  assert.deepEqual(paths, [
    "/cliente/dashboard",
    "/cliente/explore",
    "/cliente/analytics",
  ]);
  const analytics = visibleNavigation("CLIENTE", []).find(
    (item) => item.path === "/cliente/analytics",
  );
  assert.equal(analytics?.group, "growth");
  assert.equal(analytics?.permission, undefined);
  assert(paths.every((path) => path.startsWith("/cliente/")));
});

test("analítica permanece privada y respeta el espacio del rol autenticado", () => {
  const destination = "/cliente/analytics?range=month";
  assert(!guestNavigation().some((item) => item.path === "/cliente/analytics"));
  assert.equal(browseDestination(destination), guestHome);
  assert.equal(authenticatedDestination("CLIENTE", destination), destination);

  for (const role of ["SUPERADMIN", "ADMIN_BARBERIA", "PROFESSIONAL"]) {
    assert.equal(authenticatedDestination(role, destination), roleHome(role));
    assert(
      !visibleNavigation(role, ["reports.view"]).some(
        (item) => item.path === "/cliente/analytics",
      ),
    );
  }
});
