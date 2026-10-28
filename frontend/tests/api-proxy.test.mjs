import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const { default: proxy } = await import(`${process.cwd()}/api/proxy.ts`);
const originalFetch = globalThis.fetch;
const originalOrigin = process.env.HABITU_API_ORIGIN;
const originalProxySecret = process.env.HABITU_PROXY_SECRET;
const originalVercel = process.env.VERCEL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalOrigin === undefined) delete process.env.HABITU_API_ORIGIN;
  else process.env.HABITU_API_ORIGIN = originalOrigin;
  if (originalProxySecret === undefined) delete process.env.HABITU_PROXY_SECRET;
  else process.env.HABITU_PROXY_SECRET = originalProxySecret;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

test("sin backend devuelve 503 JSON y nunca la página SPA", async () => {
  delete process.env.HABITU_API_ORIGIN;
  globalThis.fetch = () => assert.fail("No existe un destino configurado");
  const response = await proxy.fetch(
    new Request("https://app.test/api/auth/login"),
  );
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal((await response.json()).error, "API_NOT_CONFIGURED");
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("rechaza destinos que no son un origen HTTPS fijo", async () => {
  globalThis.fetch = () => assert.fail("No se deben enviar credenciales");
  for (const origin of [
    "http://backend.test",
    "https://user:secret@backend.test",
    "https://backend.test/path",
    "https://backend.test?target=other",
    "https://backend.test#fragment",
    "invalid",
  ]) {
    process.env.HABITU_API_ORIGIN = origin;
    const response = await proxy.fetch(
      new Request("https://app.test/api/auth/me"),
    );
    assert.equal(response.status, 503, origin);
  }
});

test("preserva método, cuerpo, query y credenciales únicamente hacia el servidor fijo", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(
      url.href,
      "https://backend.test/api/v2/wompi/wallet?target=https%3A%2F%2Fevil.test&limit=2",
    );
    assert.equal(init.method, "POST");
    assert.equal(new TextDecoder().decode(init.body), '{"amount":5000}');
    assert.equal(init.headers.get("authorization"), "Bearer user-token");
    assert.equal(init.headers.get("idempotency-key"), "payment-key");
    assert.equal(init.headers.get("content-type"), "application/json");
    assert.equal(init.headers.get("cookie"), null);
    assert.equal(init.headers.get("x-forwarded-host"), null);
    assert.equal(init.redirect, "manual");
    assert.equal(init.cache, "no-store");
    return Response.json(
      { success: false, message: "Monto no permitido" },
      {
        status: 422,
        headers: {
          "Set-Cookie": "private=secret",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  };
  const response = await proxy.fetch(
    new Request(
      "https://app.test/api/v2/wompi/wallet?target=https%3A%2F%2Fevil.test&limit=2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer user-token",
          "Idempotency-Key": "payment-key",
          Cookie: "session=private",
          "X-Forwarded-Host": "evil.test",
        },
        body: '{"amount":5000}',
      },
    ),
  );
  assert.equal(calls, 1);
  assert.equal(response.status, 422);
  assert.equal((await response.json()).message, "Monto no permitido");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("no sigue ni publica redirecciones externas con tokens", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(init.redirect, "manual");
    return new Response(null, {
      status: 307,
      headers: { Location: "https://evil.test/?token=secret" },
    });
  };
  const response = await proxy.fetch(
    new Request("https://app.test/api/auth/me"),
  );
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("location"), null);
  assert.equal((await response.json()).error, "API_REDIRECT_BLOCKED");
  assert.equal(calls, 1);
});

test("fallos o timeouts nunca reintentan una mutación", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  for (const failure of [
    new Error("offline"),
    new DOMException("timeout", "TimeoutError"),
  ]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      throw failure;
    };
    const response = await proxy.fetch(
      new Request("https://app.test/api/v2/booking/checkout", {
        method: "POST",
        body: "{}",
      }),
    );
    assert.equal(response.status, failure.name === "TimeoutError" ? 504 : 502);
    assert.equal(calls, 1);
    assert.match((await response.json()).message, /antes de repetir/);
  }
});

test("rechaza HTML de upstream y conserva respuestas sin cuerpo", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  globalThis.fetch = async () =>
    new Response("<html>SPA</html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  const invalid = await proxy.fetch(
    new Request("https://app.test/api/auth/me"),
  );
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error, "API_INVALID_RESPONSE");
  globalThis.fetch = async () => new Response(null, { status: 204 });
  const empty = await proxy.fetch(
    new Request("https://app.test/api/auth/logout", { method: "POST" }),
  );
  assert.equal(empty.status, 204);
  assert.equal(await empty.text(), "");
});

test("el handler no puede usarse como proxy fuera de /api", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  globalThis.fetch = () => assert.fail("La ruta no corresponde a la API");
  const response = await proxy.fetch(
    new Request("https://app.test/cliente/wallet"),
  );
  assert.equal(response.status, 404);
});

test("el rewrite estático conserva la ruta API y elimina sólo el parámetro interno", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  const destinations = [];
  globalThis.fetch = async (url) => {
    destinations.push(url.href);
    return Response.json({ success: true });
  };
  for (const url of [
    "https://app.test/api/proxy?__habitu_api_path=auth%2Fconfig&filter=one&filter=two",
    "https://app.test/api/auth/config?__habitu_api_path=auth/config&filter=one&filter=two",
  ]) {
    const response = await proxy.fetch(new Request(url));
    assert.equal(response.status, 200);
  }
  assert.deepEqual(destinations, [
    "https://backend.test/api/auth/config?filter=one&filter=two",
    "https://backend.test/api/auth/config?filter=one&filter=two",
  ]);
});

test("el parámetro interno nunca permite salir de /api o cambiar el origen", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(url.origin, "https://backend.test");
    assert.match(url.pathname, /^\/api\//);
    return Response.json({ success: true });
  };
  const escaped = await proxy.fetch(new Request("https://app.test/api/proxy?__habitu_api_path=..%2Fauth"));
  assert.equal(escaped.status, 400);
  const fixed = await proxy.fetch(new Request("https://app.test/api/proxy?__habitu_api_path=https%3A%2F%2Fevil.test%2Fsecret"));
  assert.equal(fixed.status, 200);
  assert.equal(calls, 1);
});


test("firma la IP del proveedor Vercel e ignora IPs y firmas enviadas por el cliente", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  process.env.HABITU_PROXY_SECRET = "production-proxy-test-shared-secret-64-characters";
  process.env.VERCEL = "1";
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.get("X-Habitu-Client-IP"), "198.51.100.20");
    const timestamp = init.headers.get("X-Habitu-Proxy-Timestamp");
    assert.match(timestamp, /^\d{10,11}$/);
    assert.ok(Math.abs(Date.now() / 1000 - Number(timestamp)) < 2);
    assert.equal(
      init.headers.get("X-Habitu-Proxy-Signature"),
      createHmac("sha256", process.env.HABITU_PROXY_SECRET)
        .update(`${timestamp}\n198.51.100.20`)
        .digest("hex"),
    );
    assert.equal(init.headers.get("x-forwarded-for"), null);
    assert.equal(init.headers.get("x-vercel-forwarded-for"), null);
    return Response.json({ success: true });
  };
  const response = await proxy.fetch(new Request("https://app.test/api/auth/config", {
    headers: {
      "x-vercel-forwarded-for": "198.51.100.20",
      "x-forwarded-for": "203.0.113.200",
      "X-Habitu-Client-IP": "203.0.113.201",
      "X-Habitu-Proxy-Timestamp": "1000000000",
      "X-Habitu-Proxy-Signature": "forged",
    },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Habitu-Proxy-Signature"), null);
});

test("la firma admite IPv6 del proveedor sin modificarla", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  process.env.HABITU_PROXY_SECRET = "production-proxy-test-shared-secret-64-characters";
  process.env.VERCEL = "1";
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.get("X-Habitu-Client-IP"), "2001:db8::20");
    assert.match(init.headers.get("X-Habitu-Proxy-Signature"), /^[a-f0-9]{64}$/);
    return Response.json({ success: true });
  };
  assert.equal((await proxy.fetch(new Request("https://app.test/api/auth/config", {
    headers: { "x-vercel-forwarded-for": "2001:db8::20" },
  }))).status, 200);
});

test("no firma fuera de Vercel, sin secreto fuerte o con IP del proveedor inválida", async () => {
  process.env.HABITU_API_ORIGIN = "https://backend.test";
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.get("X-Habitu-Client-IP"), null);
    assert.equal(init.headers.get("X-Habitu-Proxy-Timestamp"), null);
    assert.equal(init.headers.get("X-Habitu-Proxy-Signature"), null);
    return Response.json({ success: true });
  };
  for (const [vercel, secret, ip] of [
    ["0", "production-proxy-test-shared-secret-64-characters", "198.51.100.20"],
    ["1", "", "198.51.100.20"],
    ["1", "weak-secret", "198.51.100.20"],
    ["1", "production-proxy-test-shared-secret-64-characters", "invalid"],
    ["1", "production-proxy-test-shared-secret-64-characters", "198.51.100.20, 198.51.100.21"],
    ["1", "production-proxy-test-shared-secret-64-characters", ""],
  ]) {
    process.env.VERCEL = vercel;
    process.env.HABITU_PROXY_SECRET = secret;
    const response = await proxy.fetch(new Request("https://app.test/api/auth/config", {
      headers: { "x-vercel-forwarded-for": ip, "x-forwarded-for": "198.51.100.25",
        "X-Habitu-Client-IP": "198.51.100.25", "X-Habitu-Proxy-Signature": "forged" },
    }));
    assert.equal(response.status, 200);
  }
});
