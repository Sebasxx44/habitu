import assert from "node:assert/strict";
import test from "node:test";
import axios, { AxiosError } from "axios";

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = Object.assign(new EventTarget(), {
  location: { pathname: "/cliente/dashboard", href: "" },
});
const pending = [];
axios.defaults.adapter = (config) =>
  new Promise((resolve, reject) => pending.push({ config, resolve, reject }));
const { authService, httpService } =
  await import("@/services/auth/authService");
const nextRequest = async (url) => {
  await new Promise(setImmediate);
  const index = pending.findIndex((request) => request.config.url === url);
  assert(index >= 0, `Solicitud pendiente ${url}`);
  return pending.splice(index, 1)[0];
};
const resolve = (request, data = {}) =>
  request.resolve({
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: request.config,
  });

test("una renovación tardía no recupera la sesión después del logout", async () => {
  httpService.setToken("session-before-logout");
  const refresh = authService.refreshToken();
  const request = await nextRequest("/auth/refresh-token");
  const logout = authService.logout();
  const logoutRequest = await nextRequest("/auth/logout");
  resolve(logoutRequest);
  await logout;
  resolve(request, { token: "obsolete-refresh", expires_in: 3600 });
  await refresh;
  assert.equal(storage.get("eb_token"), undefined);
});

test("el logout tardío conserva un nuevo login y revoca solamente su token original", async () => {
  httpService.setToken("session-to-revoke");
  const logout = authService.logout();
  httpService.setToken("new-session");
  const request = await nextRequest("/auth/logout");
  assert.equal(
    request.config.headers.Authorization,
    "Bearer session-to-revoke",
  );
  resolve(request);
  await logout;
  assert.equal(storage.get("eb_token"), "new-session");
});

test("un 401 de una sesión antigua no cierra la sesión actual", async () => {
  httpService.setToken("old-session");
  const response = httpService.get("/protected");
  const rejection = assert.rejects(response);
  const request = await nextRequest("/protected");
  httpService.setToken("current-session");
  request.reject(
    new AxiosError("Expired", "ERR_BAD_REQUEST", request.config, null, {
      status: 401,
      statusText: "Unauthorized",
      data: {},
      headers: {},
      config: request.config,
    }),
  );
  await rejection;
  assert.equal(storage.get("eb_token"), "current-session");
  assert.equal(window.location.href, "");
});

test("cancelar una sesión invalida un login que seguía pendiente", async () => {
  httpService.clearToken();
  const login = authService.login({
    email: "local@example.test",
    password: "test-only",
  });
  const rejection = assert.rejects(login, /sesión cambió/);
  const request = await nextRequest("/auth/login");
  httpService.clearToken();
  resolve(request, { token: "cancelled-login", expires_in: 3600 });
  await rejection;
  assert.equal(storage.get("eb_token"), undefined);
});

test("un token vencido en auth/me se limpia sin sacar al visitante del catálogo", async () => {
  window.location = {
    pathname: "/cliente/explore",
    search: "?q=café&category_id=2",
    hash: "#mapa",
    href: "",
  };
  httpService.setToken("expired-visitor-session");
  const response = httpService.get("/auth/me");
  const rejection = assert.rejects(response);
  const request = await nextRequest("/auth/me");
  request.reject(new AxiosError("Expired", "ERR_BAD_REQUEST", request.config, null, {
    status: 401,
    statusText: "Unauthorized",
    data: {},
    headers: {},
    config: request.config,
  }));
  await rejection;
  assert.equal(storage.get("eb_token"), undefined);
  assert.equal(storage.get("eb_token_expiry"), undefined);
  assert.equal(window.location.href, "");
});

test("una renovación rechazada limpia la sesión sin redirigir la navegación pública", async () => {
  window.location = {
    pathname: "/cliente/business/42",
    search: "?service_id=7",
    hash: "#servicios",
    href: "",
  };
  httpService.setToken("expired-refresh-session");
  const response = authService.refreshToken();
  const rejection = assert.rejects(response);
  const request = await nextRequest("/auth/refresh-token");
  request.reject(new AxiosError("Expired", "ERR_BAD_REQUEST", request.config, null, {
    status: 401,
    statusText: "Unauthorized",
    data: {},
    headers: {},
    config: request.config,
  }));
  await rejection;
  assert.equal(storage.get("eb_token"), undefined);
  assert.equal(window.location.href, "");
});

test("un 401 privado conserva el acceso requerido y toda la ruta de regreso", async () => {
  window.location = {
    pathname: "/cliente/appointments/14",
    search: "?tab=details&source=calendar",
    hash: "#reserva",
    href: "",
  };
  httpService.setToken("expired-private-session");
  const response = httpService.get("/v2/appointments/14");
  const rejection = assert.rejects(response);
  const request = await nextRequest("/v2/appointments/14");
  request.reject(new AxiosError("Expired", "ERR_BAD_REQUEST", request.config, null, {
    status: 401,
    statusText: "Unauthorized",
    data: {},
    headers: {},
    config: request.config,
  }));
  await rejection;
  assert.equal(storage.get("eb_token"), undefined);
  const destination = new URL(window.location.href, "https://habitu.test");
  assert.equal(destination.pathname, "/login");
  assert.equal(
    destination.searchParams.get("returnTo"),
    "/cliente/appointments/14?tab=details&source=calendar#reserva",
  );
});

test("un logout con push pendiente no borra el login ni el dispositivo de la nueva sesión", async () => {
  httpService.setToken("old-push-session");
  storage.set("habitu_push_device_token", "old-push-device");
  storage.set("habitu_push_device_user", "old-user");
  const logout = authService.logout();
  assert.equal(storage.get("eb_token"), undefined);
  assert.equal(storage.get("habitu_push_device_token"), undefined);
  assert.equal(storage.get("habitu_push_device_user"), undefined);

  const unregister = await nextRequest("/v2/push/unregister");
  assert.equal(unregister.config.headers.Authorization, "Bearer old-push-session");
  assert.equal(JSON.parse(unregister.config.data).token, "old-push-device");

  httpService.setToken("new-push-session");
  storage.set("habitu_push_device_token", "new-push-device");
  storage.set("habitu_push_device_user", "new-user");
  resolve(unregister);
  const revoke = await nextRequest("/auth/logout");
  assert.equal(revoke.config.headers.Authorization, "Bearer old-push-session");
  resolve(revoke);
  await logout;

  assert.equal(storage.get("eb_token"), "new-push-session");
  assert.equal(storage.get("habitu_push_device_token"), "new-push-device");
  assert.equal(storage.get("habitu_push_device_user"), "new-user");
});
