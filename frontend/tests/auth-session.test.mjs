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
