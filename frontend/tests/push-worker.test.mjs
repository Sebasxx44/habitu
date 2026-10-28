import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// TESTS
test("PWA worker uses a stable event tag and does not re-alert replacement notifications", async () => {
  const handlers = new Map();
  const notifications = [];
  const pending = [];
  const self = {
    addEventListener: (type, listener) => handlers.set(type, listener),
    registration: { showNotification: async (title, options) => { notifications.push({ title, options }); } },
  };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self });
  const push = handlers.get("push");
  for (const id of ["notification-1", "notification-1", "notification-2"]) {
    push({ data: { json: () => ({ data: { event_id: id }, notification: { body: "private appointment details" } }) }, waitUntil: (promise) => pending.push(promise) });
  }
  await Promise.all(pending);
  assert.equal(notifications[0].options.tag, notifications[1].options.tag);
  assert.notEqual(notifications[0].options.tag, notifications[2].options.tag);
  assert.equal(notifications[1].options.renotify, false);
  assert.equal(notifications[0].options.body.includes("private appointment details"), false);
  assert.equal(handlers.has("fetch"), true);
});
