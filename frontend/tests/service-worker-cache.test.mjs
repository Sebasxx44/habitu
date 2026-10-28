/* global URL, Response, Headers */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// FIXTURES
const workerSource = readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
const createWorker = () => {
  const handlers = new Map();
  const entries = new Map();
  const requests = [];
  let network = async () =>
    new Response("fresh", { headers: { "Content-Type": "text/html" } });
  let quotaExceeded = false;
  const keyOf = (request) => {
    const url = new URL(
      typeof request === "string" ? request : request.url,
      "https://habitu.test",
    );
    return `${url.pathname}${url.search}`;
  };
  const cache = {
    put: async (request, response) => {
      if (quotaExceeded) throw new Error("Quota exceeded");
      entries.set(keyOf(request), response);
    },
  };
  vm.runInNewContext(workerSource, {
    URL,
    Response,
    self: {
      location: { origin: "https://habitu.test" },
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    caches: {
      open: async () => cache,
      match: async (request) => entries.get(keyOf(request))?.clone(),
    },
    fetch: async (request, options) => {
      requests.push({ request, options });
      return network(request, options);
    },
  });
  const request = (path, options = {}) => {
    let response;
    handlers.get("fetch")({
      request: {
        url: new URL(path, "https://habitu.test").href,
        method: "GET",
        mode: "cors",
        headers: new Headers(),
        ...options,
      },
      respondWith: (result) => {
        response = result;
      },
    });
    return response;
  };
  return {
    request,
    entries,
    requests,
    network: (handler) => {
      network = handler;
    },
    exhaustQuota: () => {
      quotaExceeded = true;
    },
  };
};

// TESTS
test("navigation fetches the latest release and refreshes the offline shell", async () => {
  const worker = createWorker();
  worker.entries.set("/index.html", new Response("old release"));
  const response = await worker.request("/cliente/appointments", {
    mode: "navigate",
  });
  assert.equal(await response.text(), "fresh");
  assert.equal(worker.requests[0].options.cache, "no-store");
  assert.equal(await worker.entries.get("/index.html").text(), "fresh");
});

test("only navigation falls back to the public shell while offline", async () => {
  const worker = createWorker();
  worker.entries.set("/index.html", new Response("offline shell"));
  worker.network(async () => {
    throw new Error("Offline");
  });
  const response = await worker.request("/cliente/appointments", {
    mode: "navigate",
  });
  assert.equal(await response.text(), "offline shell");
  assert.equal(worker.request("/private-document.json"), undefined);
});

test("API, authenticated requests, external providers and mutations bypass the cache", () => {
  const worker = createWorker();
  for (const [path, options] of [
    ["/api/auth/me", {}],
    ["/api", {}],
    ["https://accounts.google.com/gsi/client", {}],
    ["/index.html", { method: "POST" }],
    [
      "/assets/private.js",
      { headers: new Headers({ Authorization: "Bearer private-session" }) },
    ],
  ])
    assert.equal(worker.request(path, options), undefined);
  assert.equal(worker.entries.size, 0);
  assert.equal(worker.requests.length, 0);
});

test("hashed build assets work offline after loading them online", async () => {
  const worker = createWorker();
  worker.network(
    async () =>
      new Response("bundle-v2", {
        headers: { "Content-Type": "text/javascript" },
      }),
  );
  const online = await worker.request("/assets/main-HASH.js");
  assert.equal(await online.text(), "bundle-v2");
  worker.network(async () => {
    throw new Error("Offline");
  });
  const offline = await worker.request("/assets/main-HASH.js");
  assert.equal(await offline.text(), "bundle-v2");
  assert.equal(worker.requests.length, 1);
});

test("private, no-store and failed responses never replace the cached shell", async () => {
  const worker = createWorker();
  worker.entries.set("/index.html", new Response("public shell"));
  for (const headers of [
    { "Cache-Control": "private" },
    { "Cache-Control": "no-store" },
  ]) {
    worker.network(
      async () =>
        new Response("private", {
          headers: { "Content-Type": "text/html", ...headers },
        }),
    );
    const response = await worker.request("/cliente/profile", {
      mode: "navigate",
    });
    assert.equal(await response.text(), "private");
    assert.equal(
      await worker.entries.get("/index.html").clone().text(),
      "public shell",
    );
  }
  worker.network(
    async () =>
      new Response("unavailable", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      }),
  );
  const unavailable = await worker.request("/cliente/profile", {
    mode: "navigate",
  });
  assert.equal(unavailable.status, 503);
  assert.equal(await worker.entries.get("/index.html").text(), "public shell");
});

test("cache quota failures preserve a successful network response", async () => {
  const worker = createWorker();
  worker.exhaustQuota();
  const response = await worker.request("/cliente/dashboard", {
    mode: "navigate",
  });
  assert.equal(await response.text(), "fresh");
});
